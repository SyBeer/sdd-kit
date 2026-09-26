#!/usr/bin/env node
// Lokalny panel sdd-kit: postep procesu SDD i tablica warsztatowa.
// Uruchom:  node server.js [sciezka/do/board.json] [port]
// Strony:  /  panel postepu (+ zalaczniki do Intake, nowy modul),  /board  tablica warsztatowa.
// Agent (Claude Code) pisze do plikow, przegladarka odswieza sie sama (SSE).
// Katalog wymagan: SDD_REQ albo nadrzedny 'requirements/' pliku tablicy, albo ./requirements.
// Katalog modulow: SDD_MODULES_ROOT, wybor z panelu (~/.sdd-kit/config.json) albo folder nadrzedny
// istniejacego projektu. Nigdy folder aplikacji - wtedy panel pyta o katalog (zmiana 0.8.0).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { readProgress } = require('./progress');
const { listModules, createModule, saveIntake, removeIntake } = require('./modules');
const { stampNotes, syncMap } = require('./board-ops');
const { KIT_DIR, configPath, inside, saveRoot, checkRoot, resolveRoot, listDirs } = require('./root');

const PORT = parseInt(process.argv[3] || process.env.PORT || '8012', 10);
const UI = path.join(__dirname, 'index.html');  // tablica, korzysta z /board-ops.js
const PROGRESS_UI = path.join(__dirname, 'progress.html');
const MAX_UPLOAD = 25 * 1024 * 1024;

const boardArg = path.resolve(process.argv[2] || 'requirements/01-interview/board.json');
function reqOf(file) {
  const parts = file.split(path.sep);
  const i = parts.lastIndexOf('requirements');
  return i > 0 ? parts.slice(0, i + 1).join(path.sep) : null;
}
// Tablica spoza requirements/ (np. --demo) zostaje stala przy zmianie modulu.
const CUSTOM_BOARD = reqOf(boardArg) ? null : boardArg;

const state = { req: null, board: null };
const START_REQ = process.env.SDD_REQ ? path.resolve(process.env.SDD_REQ) : (reqOf(boardArg) || path.resolve('requirements'));
const resolved = resolveRoot({ project: START_REQ });
let ROOT = resolved.root;

// ---------------------------------------------------------------- tablica
function emptyBoard() {
  return { title: 'Warsztat', subtitle: '', lanes: [], notes: [], updated: new Date().toISOString() };
}
function readBoard() {
  try { return JSON.parse(fs.readFileSync(state.board, 'utf8')); }
  catch (e) { return emptyBoard(); }
}
// Tablica dla przegladarki: z wyliczonym stanem synchronizacji z plikami (_sync, nie trafia do board.json).
function boardView() {
  const b = readBoard();
  b._sync = syncMap(b, rel => {
    if (!state.req) return null;
    const f = path.resolve(state.req, String(rel));
    if (!f.startsWith(state.req + path.sep)) return null;
    try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; }
  });
  // naglowek "Wymagania do modulu" na tablicy; jak _sync - nie trafia do board.json
  b._module = { name: state.req ? path.basename(path.dirname(state.req)) : '' };
  b._modules = listModules(ROOT).map(m => ({ name: m.name, level: m.level }));
  return b;
}
const VIEW_ONLY = ['_sync', '_module', '_modules'];
function writeBoard(b) {
  VIEW_ONLY.forEach(k => { delete b[k]; });
  b.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(state.board), { recursive: true });
  fs.writeFileSync(state.board, JSON.stringify(b, null, 2));
}

// ---------------------------------------------------------------- SSE
const boardClients = new Set();
const progressClients = new Set();
function progressPayload() {
  const p = state.req ? readProgress(state.req) : { exists: false };
  p.module = state.req ? { name: path.basename(path.dirname(state.req)), dir: path.dirname(state.req) } : null;
  p.modules = ROOT ? listModules(ROOT).map(m => ({ name: m.name, project: m.project, level: m.level })) : [];
  p.modulesRoot = ROOT;
  p.needsRoot = !ROOT;
  p.kitDir = KIT_DIR;
  return p;
}
const send = (set, obj) => { const d = `data: ${JSON.stringify(obj)}\n\n`; for (const r of set) r.write(d); };
let btimer = null, ptimer = null;
const broadcastBoard = () => { clearTimeout(btimer); btimer = setTimeout(() => send(boardClients, boardView()), 120); };
const broadcastProgress = () => { clearTimeout(ptimer); ptimer = setTimeout(() => send(progressClients, progressPayload()), 150); };

// ---------------------------------------------------------------- watchery (przepinane przy zmianie modulu)
let watchers = [], retry = null;
function watch() {
  watchers.forEach(w => w.close()); watchers = []; clearTimeout(retry);
  if (state.req) try {
    watchers.push(fs.watch(state.req, { recursive: true }, (ev, file) => {
      broadcastProgress();
      broadcastBoard(); // stan synchronizacji zalezy tez od plikow w requirements/
    }));
  } catch (e) {
    retry = setTimeout(watch, 3000); // requirements/ jeszcze nie ma
  }
  if (CUSTOM_BOARD) {
    try {
      watchers.push(fs.watch(path.dirname(CUSTOM_BOARD), (ev, file) => {
        if (!file || file === path.basename(CUSTOM_BOARD)) broadcastBoard();
      }));
    } catch (e) { /* brak katalogu tablicy */ }
  }
}
function selectModule(req) {
  state.req = req;
  state.board = CUSTOM_BOARD || (req ? path.join(req, '01-interview', 'board.json') : null);
  watch();
  send(progressClients, progressPayload());
  send(boardClients, boardView());
}
// Modul startowy: wskazany projekt (jesli nie lezy w aplikacji), inaczej pierwszy z katalogu, inaczej zaden.
function firstModule() {
  const m = ROOT ? listModules(ROOT)[0] : null;
  return m ? path.join(m.dir, 'requirements') : null;
}
const startInKit = inside(path.dirname(START_REQ), KIT_DIR);
selectModule(!startInKit && fs.existsSync(START_REQ) ? START_REQ : firstModule());

// ---------------------------------------------------------------- HTTP
function sendHtml(res, file) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit, cb) {
  const chunks = []; let size = 0, over = false;
  req.on('data', c => {
    size += c.length;
    if (size > limit) { over = true; req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => { if (!over) cb(Buffer.concat(chunks)); });
  req.on('close', () => { if (over) cb(null); });
}
// Zapisy tylko z tej strony: wlasny naglowek (wymusza preflight dla obcych stron) i Host lokalny.
function allowedWrite(req) {
  const host = (req.headers.host || '').split(':')[0];
  return req.headers['x-sdd'] === '1' && (host === 'localhost' || host === '127.0.0.1' || host === '[::1]');
}
function sse(req, res, set, first) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify(first)}\n\n`);
  set.add(res);
  req.on('close', () => set.delete(res));
}

// Wspolne pliki panelu i tablicy (sciezka = nazwa pliku obok server.js).
const ASSETS = { '/board-ops.js': 'text/javascript', '/ui.js': 'text/javascript', '/ui.css': 'text/css' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const url = u.pathname;
  const write = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
  if (write && !allowedWrite(req)) return json(res, 403, { error: 'Zapis tylko z panelu sdd-board.' });

  if (url === '/' || url === '/progress') return sendHtml(res, PROGRESS_UI);
  if (url === '/board' || url === '/index.html') return sendHtml(res, UI);
  if (ASSETS[url]) {
    res.writeHead(200, { 'Content-Type': ASSETS[url] + '; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, url.slice(1))).pipe(res);
  }

  if (url === '/api/progress' && req.method === 'GET') return json(res, 200, progressPayload());
  if (url === '/progress-events') return sse(req, res, progressClients, progressPayload());

  if (url === '/api/intake' && req.method === 'POST') {
    const name = u.searchParams.get('name') || '';
    if (!state.req || !fs.existsSync(state.req)) return json(res, 409, { error: 'Brak requirements/ w tym module.' });
    return readBody(req, MAX_UPLOAD, buf => {
      if (!buf) return json(res, 413, { error: 'Plik wiekszy niz 25 MB.' });
      try {
        const r = saveIntake(state.req, name, buf);
        json(res, r.saved ? 201 : 200, r);
      }
      catch (e) { json(res, 500, { error: e.message }); }
    });
  }

  if (url === '/api/intake' && req.method === 'DELETE') {
    if (!state.req) return json(res, 409, { error: 'Nie wybrano modułu.' });
    try { return json(res, 200, { removed: removeIntake(state.req, u.searchParams.get('name') || '') }); }
    catch (e) { return json(res, /w spisie/.test(e.message) ? 409 : 404, { error: e.message }); }
  }

  // Tylko odczyt, ale zdradza strukture dysku - ta sama ochrona co zapisy.
  if (url === '/api/dirs' && req.method === 'GET') {
    if (!allowedWrite(req)) return json(res, 403, { error: 'Tylko z panelu sdd-board.' });
    try { return json(res, 200, listDirs(u.searchParams.get('path') || '')); }
    catch (e) { return json(res, 404, { error: e.message }); }
  }
  if (url === '/api/root' && req.method === 'POST') {
    return readBody(req, 64 * 1024, buf => {
      try {
        const dir = checkRoot(JSON.parse(String(buf || '{}')).path);
        saveRoot(configPath(), dir);
        ROOT = dir;
        selectModule(state.req && inside(state.req, dir) ? state.req : firstModule());
        json(res, 200, { modulesRoot: dir, module: state.req ? path.basename(path.dirname(state.req)) : null });
      } catch (e) { json(res, 400, { error: e.message }); }
    });
  }
  if (url === '/api/modules' && req.method === 'POST') {
    if (!ROOT) return json(res, 409, { error: 'Najpierw wskaż katalog modułów.' });
    return readBody(req, 64 * 1024, buf => {
      try {
        const body = JSON.parse(String(buf || '{}'));
        const dir = createModule(ROOT, body);
        selectModule(path.join(dir, 'requirements'));
        json(res, 201, { name: path.basename(dir), dir });
      } catch (e) { json(res, 400, { error: e.message }); }
    });
  }
  if (url === '/api/modules/select' && req.method === 'POST') {
    return readBody(req, 64 * 1024, buf => {
      let name = '';
      try { name = JSON.parse(String(buf || '{}')).name; } catch (e) { /* zly JSON */ }
      const m = listModules(ROOT).find(x => x.name === name);
      if (!m) return json(res, 404, { error: 'Nie ma modulu ' + name });
      selectModule(path.join(m.dir, 'requirements'));
      json(res, 200, { name: m.name });
    });
  }

  if (url === '/api/board' && req.method === 'GET') return json(res, 200, boardView());
  if (url === '/api/board' && req.method === 'PUT') {
    if (!state.board) return json(res, 409, { error: 'Nie wybrano modułu.' });
    return readBody(req, 5 * 1024 * 1024, buf => {
      try { writeBoard(stampNotes(readBoard(), JSON.parse(String(buf)), new Date().toISOString())); res.writeHead(204); res.end(); }
      catch (e) { res.writeHead(400); res.end('zly JSON'); }
    });
  }
  if (url === '/events') return sse(req, res, boardClients, boardView());
  res.writeHead(404); res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Panel:    http://localhost:${PORT}`);
  console.log(`Tablica:  http://localhost:${PORT}/board`);
  console.log(`Modul:    ${state.req ? path.dirname(state.req) : 'brak'}`);
  if (resolved.rejected) console.log(`Pomijam:  ${resolved.rejected} - to folder aplikacji sdd-kit, wymagan tu nie trzymam.`);
  console.log(`Moduly w: ${ROOT || 'nie wybrano - wskaz katalog w panelu'}`);
  console.log('Zostaw to okno otwarte. Ctrl+C konczy.');
});

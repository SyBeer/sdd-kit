#!/usr/bin/env node
// Lokalny panel sdd-kit: postep procesu SDD i tablica warsztatowa.
// Uruchom:  node server.js [sciezka/do/board.json] [port]
// Strony:  /  panel postepu (+ zalaczniki do Intake, nowy modul),  /board  tablica warsztatowa,
//          /module, /guide, /config  opis modulu, jak to dziala, konfiguracja (0.16.0).
//          /demo, /demo/board  gotowy modul po SDD;  /demo/start  tablica z poczatku warsztatu (tylko podglad, 0.12.0).
// Agent (Claude Code) pisze do plikow, przegladarka odswieza sie sama (SSE).
// Katalog wymagan: SDD_REQ albo nadrzedny 'requirements/' pliku tablicy, albo ./requirements.
// Katalog modulow: SDD_MODULES_ROOT, wybor z panelu (~/.sdd-kit/config.json) albo folder nadrzedny
// istniejacego projektu. Nigdy folder aplikacji - wtedy panel pyta o katalog (zmiana 0.8.0).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { readProgress, questionIndex } = require('./progress');
const { listModules, allModules, createModule, saveIntake, removeIntake, intakeFile } = require('./modules');
const { stampNotes, syncMap } = require('./board-ops');
const { KIT_DIR, configPath, inside, readConfig, writeConfig, saveRoot, addModule, checkRoot, resolveRoot, listDirs, pluginVersion } = require('./root');
const info = require('./info');
const terminal = require('./terminal');
const update = require('./update');

const PORT = parseInt(process.argv[3] || process.env.PORT || '8012', 10);
const UI = path.join(__dirname, 'index.html');  // tablica, korzysta z /board-ops.js
const PROGRESS_UI = path.join(__dirname, 'progress.html');
const INFO_UI = path.join(__dirname, 'info.html');  // Modul, Jak to dziala, Konfiguracja
// Wersja z chwili startu i wersja na dysku (AC-U11): rozne = serwer dziala na starym kodzie, trzeba go zrestartowac.
function diskVersion() { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')).version || ''; } catch (e) { return ''; } }
const VERSION = diskVersion();
const MAX_UPLOAD = 25 * 1024 * 1024;
const DEMO_REQ = path.join(__dirname, '..', 'demo', 'zlecenia', 'requirements');
const DEMO_START_BOARD = path.join(__dirname, 'example-zlecenia.json');
const READ_ONLY = 'Demo - tylko podgląd.';

const boardArg = path.resolve(process.argv[2] || 'requirements/01-interview/board.json');
function reqOf(file) {
  const parts = file.split(path.sep);
  const i = parts.lastIndexOf('requirements');
  return i > 0 ? parts.slice(0, i + 1).join(path.sep) : null;
}

const CONFIG = configPath();
const START_REQ = process.env.SDD_REQ ? path.resolve(process.env.SDD_REQ) : (reqOf(boardArg) || path.resolve('requirements'));
const resolved = resolveRoot({ project: START_REQ });
let ROOT = resolved.root;
let ROOT_SOURCE = resolved.source; // env / config / project - pokazywane w Konfiguracji

// ---------------------------------------------------------------- konteksty
// Kontekst = jeden modul z tablica i wlasnymi klientami SSE. Twoj (base '') zmienia modul i zapisuje;
// demo ('/demo', '/demo/start') sa stale i tylko do odczytu (zmiana 0.12.0).
function context(base, demo, board) {
  // Tablica spoza requirements/ zostaje stala przy zmianie modulu.
  return { base, demo, req: null, board: null, fixedBoard: board && !reqOf(board) ? board : null,
    boardClients: new Set(), progressClients: new Set(), watchers: [], retry: null, btimer: null, ptimer: null };
}
const user = context('', null, boardArg);
const demoWynik = context('/demo', 'wynik');
const demoStart = context('/demo/start', 'start', DEMO_START_BOARD);
// Kolejnosc ma znaczenie: dluzszy przedrostek pierwszy.
const CONTEXTS = [demoStart, demoWynik, user];
function contextOf(pathname) {
  return CONTEXTS.find(c => c.base && (pathname === c.base || pathname.startsWith(c.base + '/'))) || user;
}
function modulesOf(ctx) {
  if (ctx.demo === 'wynik') return listModules(path.dirname(path.dirname(DEMO_REQ))).filter(m => m.name === 'zlecenia');
  if (ctx.demo) return [];
  // katalog modulow + foldery dodane recznie (zmiana 0.13.0)
  return allModules(ROOT, readConfig(CONFIG).modules);
}
const moduleName = ctx => ctx.req ? path.basename(path.dirname(ctx.req)) : '';

// ---------------------------------------------------------------- tablica
function emptyBoard() {
  return { title: 'Warsztat', subtitle: '', lanes: [], notes: [], updated: new Date().toISOString() };
}
function readBoard(ctx) {
  try { return JSON.parse(fs.readFileSync(ctx.board, 'utf8')); }
  catch (e) { return emptyBoard(); }
}
// Tablica dla przegladarki: z wyliczonym stanem synchronizacji z plikami (_sync, nie trafia do board.json).
function boardView(ctx) {
  const b = readBoard(ctx);
  b._sync = syncMap(b, rel => {
    if (!ctx.req) return null;
    const f = path.resolve(ctx.req, String(rel));
    if (!f.startsWith(ctx.req + path.sep)) return null;
    try { return fs.readFileSync(f, 'utf8').replace(/\r\n?/g, '\n'); } catch (e) { return null; }
  });
  // naglowek "Wymagania do modulu" na tablicy; jak _sync - nie trafia do board.json
  b._module = { name: moduleName(ctx), dir: ctx.req && !ctx.demo ? path.dirname(ctx.req) : '' };
  b._modules = modulesOf(ctx).map(m => ({ name: m.name, level: m.level, dir: ctx.demo ? '' : m.dir, external: !!m.external }));
  b._demo = ctx.demo || false;
  b._file = ctx.board || ''; // strona ostrzega, gdy serwer podmieni plik tablicy (AC-B37)
  b._questions = ctx.req ? questionIndex(ctx.req) : {}; // pytania z pliku na tablicy (AC-B40)
  return b;
}
const VIEW_ONLY = ['_sync', '_module', '_modules', '_demo', '_file', '_questions'];
function writeBoard(ctx, b) {
  VIEW_ONLY.forEach(k => { delete b[k]; });
  b.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(ctx.board), { recursive: true });
  fs.writeFileSync(ctx.board, JSON.stringify(b, null, 2));
}

// ---------------------------------------------------------------- SSE
function progressPayload(ctx) {
  const p = ctx.req ? readProgress(ctx.req) : { exists: false };
  p.module = ctx.req ? { name: moduleName(ctx), dir: ctx.demo ? '' : path.dirname(ctx.req) } : null;
  p.modules = modulesOf(ctx).map(m => ({ name: m.name, project: m.project, level: m.level, dir: ctx.demo ? '' : m.dir, external: !!m.external }));
  p.modulesRoot = ctx.demo ? null : ROOT;
  p.needsRoot = !ctx.demo && !ROOT && !ctx.req;
  p.kitDir = KIT_DIR;
  p.demo = ctx.demo || false;
  return p;
}
const send = (set, obj) => { const d = `data: ${JSON.stringify(obj)}\n\n`; for (const r of set) r.write(d); };
function broadcastBoard(ctx) { clearTimeout(ctx.btimer); ctx.btimer = setTimeout(() => send(ctx.boardClients, boardView(ctx)), 120); }
function broadcastProgress(ctx) { clearTimeout(ctx.ptimer); ctx.ptimer = setTimeout(() => send(ctx.progressClients, progressPayload(ctx)), 150); }

// ---------------------------------------------------------------- watchery (przepinane przy zmianie modulu)
function watch(ctx) {
  ctx.watchers.forEach(w => w.close()); ctx.watchers = []; clearTimeout(ctx.retry);
  if (ctx.demo) return; // demo sie nie zmienia
  if (ctx.req) try {
    ctx.watchers.push(fs.watch(ctx.req, { recursive: true }, () => {
      broadcastProgress(ctx);
      broadcastBoard(ctx); // stan synchronizacji zalezy tez od plikow w requirements/
    }));
  } catch (e) {
    ctx.retry = setTimeout(() => watch(ctx), 3000); // requirements/ jeszcze nie ma
  }
  if (ctx.fixedBoard) {
    try {
      ctx.watchers.push(fs.watch(path.dirname(ctx.fixedBoard), (ev, file) => {
        if (!file || file === path.basename(ctx.fixedBoard)) broadcastBoard(ctx);
      }));
    } catch (e) { /* brak katalogu tablicy */ }
  }
}
function selectModule(ctx, req) {
  ctx.req = req;
  // Twoj modul: zapamietany na nastepny start (zmiana 0.13.0)
  if (ctx === user && req && !inside(req, KIT_DIR)) {
    try { writeConfig(CONFIG, { lastModule: path.dirname(req) }); } catch (e) { /* brak zapisu - bez pamieci */ }
  }
  ctx.board = ctx.fixedBoard || (req ? path.join(req, '01-interview', 'board.json') : null);
  watch(ctx);
  send(ctx.progressClients, progressPayload(ctx));
  send(ctx.boardClients, boardView(ctx));
}
// Modul startowy: projekt z biezacego folderu (jesli nie lezy w aplikacji) > ostatni wybrany (jesli dalej jest
// na liscie) > pierwszy z listy > zaden.
function firstModule() {
  const m = modulesOf(user)[0];
  return m ? path.join(m.dir, 'requirements') : null;
}
function lastModule() {
  const last = readConfig(CONFIG).lastModule;
  const m = typeof last === 'string' && modulesOf(user).find(x => x.dir === path.resolve(last));
  return m ? path.join(m.dir, 'requirements') : null;
}
const startInKit = inside(path.dirname(START_REQ), KIT_DIR);
selectModule(user, !startInKit && fs.existsSync(START_REQ) ? START_REQ : (lastModule() || firstModule()));
selectModule(demoWynik, DEMO_REQ);
selectModule(demoStart, null);

// ---------------------------------------------------------------- Modul i Konfiguracja (0.16.0)
function sddFile(ctx) { return ctx.req ? path.join(ctx.req, 'SDD.yaml') : null; }
function configView(ctx) {
  const demo = !!ctx.demo;
  let sdd = null;
  if (ctx.req) {
    const y = fs.existsSync(sddFile(ctx)) ? fs.readFileSync(sddFile(ctx), 'utf8').replace(/\r\n?/g, '\n') : '';
    sdd = { project: info.yamlField(y, 'project'), level: info.yamlField(y, 'level') || 'full', owners: info.parseOwners(y),
      gate: info.yamlField(y, 'gate_blocking_status'), backlog: info.yamlField(y, 'backlog') || 'none',
      redmineUrl: info.yamlField(y, 'redmine_url'), redmineProject: info.yamlField(y, 'redmine_project'),
      file: demo ? '' : sddFile(ctx), approvesAllowed: info.APPROVES, backlogsAllowed: info.BACKLOGS };
  }
  const cfg = demo ? {} : readConfig(CONFIG);
  return {
    demo: ctx.demo || false,
    module: ctx.req ? { name: moduleName(ctx), dir: demo ? '' : path.dirname(ctx.req) } : null,
    modulesRoot: demo ? null : ROOT, rootSource: demo ? null : ROOT_SOURCE, kitDir: demo ? '' : KIT_DIR,
    modules: (Array.isArray(cfg.modules) ? cfg.modules : []).filter(d => typeof d === 'string')
      .map(d => ({ dir: d, name: path.basename(d), exists: fs.existsSync(path.join(d, 'requirements', 'SDD.yaml')) })),
    lastModule: demo ? null : (cfg.lastModule || null),
    sdd,
    server: demo ? { version: VERSION, port: PORT } : { version: VERSION, port: PORT, board: ctx.board || '', config: CONFIG },
  };
}
function localDate() {
  const d = new Date(), z = v => (v < 10 ? '0' : '') + v;
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
// Zmiana SDD.yaml z panelu: tylko project, backlog, owners (level i gate zmienia Claude - AC-C9).
function saveSdd(ctx, body) {
  const allowed = ['project', 'backlog', 'owners', 'redmine_url', 'redmine_project'];
  const keys = Object.keys(body || {});
  const bad = keys.filter(k => allowed.indexOf(k) < 0);
  if (bad.length) return { code: 400, error: 'Tego nie zmienisz w przeglądarce: ' + bad.join(', ') + '. Poziom i etykietę blokującą zmienia Claude (wymaga zmian w plikach).' };
  if (!keys.length) return { code: 400, error: 'Brak zmian.' };
  const file = sddFile(ctx);
  if (!file || !fs.existsSync(file)) return { code: 409, error: 'Brak SDD.yaml w tym module.' };
  let y = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  try {
    y = info.yamlSet(y, body);
    if (body.owners) {
      const blocked = info.roleChangeBlocked(ctx.req, info.parseOwners(y), body.owners);
      if (blocked.length) return { code: 409, error: 'Tej roli nie można usunąć ani przemianować, bo występuje w plikach: ' +
        blocked.map(b => '„' + b.role + '” (' + b.files.join(', ') + ')').join('; ') + '. Poproś Claude o zmianę nazwy we wszystkich plikach.', blocked };
      y = info.ownersSet(y, body.owners);
    }
  } catch (e) { return { code: 400, error: e.message }; }
  fs.writeFileSync(file, y);
  fs.appendFileSync(path.join(ctx.req, 'CHANGELOG.md'), localDate() + ' | config | zmiana SDD.yaml: ' + keys.join(', ') + ' | panel\n');
  return { code: 200 };
}

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
function localHost(req) {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}
function allowedWrite(req) {
  return req.headers['x-sdd'] === '1' && localHost(req);
}
function sse(req, res, set, first) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write(`data: ${JSON.stringify(first)}\n\n`);
  set.add(res);
  req.on('close', () => set.delete(res));
}

// ---------------------------------------------------------------- okno Claude Code (0.25.0, docs/specs/claude-dock.md)
// Jedna sesja na serwer, w folderze modulu z chwili startu. Tylko Twoj modul, tylko Host lokalny.
const term = new terminal.TermSession();
const termClients = new Set();
const termSend = (res, obj, ev) => res.write((ev ? 'event: ' + ev + '\n' : '') + 'data: ' + JSON.stringify(obj) + '\n\n');
term.on('data', c => { const d = c.toString('base64'); termClients.forEach(r => termSend(r, { d })); });
term.on('exit', code => termClients.forEach(r => termSend(r, { code }, 'exit')));
function termState() {
  const mod = user.req ? path.dirname(user.req) : null;
  // zapisana rozmowa Claude Code w folderze modulu -> mozna wznowic po restarcie serwera (AC-T12)
  let canResume = false;
  if (mod) { try { canResume = terminal.hasHistory(fs.realpathSync(mod)); } catch (e) { canResume = false; } }
  return Object.assign(term.state(), { available: terminal.available(), module: mod, canResume });
}
['exit', 'SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => { term.stop(); if (sig !== 'exit') process.exit(0); }));
function termRoute(req, res, url) {
  if (!localHost(req)) return json(res, 403, { error: 'Tylko z panelu sdd-board.' });
  if (url === '/api/term' && req.method === 'GET') return json(res, 200, termState());
  if (url === '/term-events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    termSend(res, { replay: true, d: term.buffer().toString('base64'), state: termState() });
    termClients.add(res);
    return req.on('close', () => termClients.delete(res));
  }
  if (req.method !== 'POST') return json(res, 404, { error: 'Nie ma takiego adresu.' });
  return readBody(req, 1024 * 1024, buf => {
    let body = {};
    try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { return json(res, 400, { error: 'zly JSON' }); }
    if (url === '/api/term/start') {
      if (!terminal.available()) return json(res, 501, { error: 'Terminal niedostępny: potrzebny Python 3 (macOS / Linux).' });
      if (!user.req) return json(res, 409, { error: 'Najpierw wybierz moduł.' });
      try { term.start({ cwd: path.dirname(user.req), cols: body.cols, rows: body.rows, resume: body.resume === true }); }
      catch (e) { return json(res, 500, { error: e.message }); }
      return json(res, 200, termState());
    }
    if (url === '/api/term/input') { term.write(String(body.data || '')); return json(res, 200, { ok: true }); }
    if (url === '/api/term/resize') { return json(res, 200, { ok: true, sent: term.resize(body.cols, body.rows, body.force === true) }); }
    if (url === '/api/term/stop') { term.stop(); return json(res, 200, { ok: true }); }
    json(res, 404, { error: 'Nie ma takiego adresu.' });
  });
}

// ---------------------------------------------------------------- nowa wersja (0.27.0, docs/specs/update.md)
const checker = update.createChecker({ url: process.env.SDD_RELEASES_URL, disabled: process.env.SDD_UPDATE_CHECK === '0' });
let updating = false;
const KIT_ROOT = process.env.SDD_KIT_DIR || path.resolve(__dirname, '..', '..', '..');  // folder kitu, z ktorego dziala panel
function updatePlanNow() {
  const src = update.marketSource(update.knownFile());
  return { src, plan: update.updatePlan(src, src && src.type === 'directory' ? update.gitState(src.path) : null,
    { dir: KIT_ROOT, state: update.gitState(KIT_ROOT) }) };
}
async function updateState(force) {
  const rel = await checker.latest(force);
  const current = diskVersion();
  const { src, plan } = updatePlanNow();
  return { current, latest: rel ? rel.version : null, url: rel ? rel.url : null,
    newer: !!rel && update.newer(rel.version, current), source: src ? src.type : null,
    canUpdate: !plan.error, reason: plan.error || null };
}

// Wspolne pliki panelu i tablicy (sciezka = nazwa pliku obok server.js).
const ASSETS = { '/board-ops.js': 'text/javascript', '/ui.js': 'text/javascript', '/ui.css': 'text/css' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (ASSETS[u.pathname]) {
    res.writeHead(200, { 'Content-Type': ASSETS[u.pathname] + '; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, u.pathname.slice(1))).pipe(res);
  }
  const ctx = contextOf(u.pathname);
  const url = u.pathname.slice(ctx.base.length) || '/';
  const write = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
  if (write && !allowedWrite(req)) return json(res, 403, { error: 'Zapis tylko z panelu sdd-board.' });
  if (ctx.demo && (write || url === '/api/dirs' || url === '/api/root/preview')) return json(res, 403, { error: READ_ONLY });
  if (url === '/api/term' || url.startsWith('/api/term/') || url === '/term-events') {
    if (ctx.demo) return json(res, 403, { error: READ_ONLY });
    return termRoute(req, res, url);
  }

  // /demo/start ma tylko tablice (bez plikow requirements/)
  if (ctx.demo === 'start' && (url === '/' || url === '/board')) return sendHtml(res, UI);
  if (url === '/' || url === '/progress') return sendHtml(res, PROGRESS_UI);
  if (url === '/board' || url === '/index.html') return sendHtml(res, UI);
  if (url === '/module' || url === '/guide' || url === '/config') return sendHtml(res, INFO_UI);

  // Nowa wersja z GitHuba (0.27.0, docs/specs/update.md)
  if (url === '/api/update' && req.method === 'GET') {
    if (!localHost(req)) return json(res, 403, { error: 'Tylko z panelu sdd-board.' });
    return updateState(u.searchParams.get('force') === '1').then(st => json(res, 200, st));
  }
  if (url === '/api/update' && req.method === 'POST') {
    if (ctx.demo) return json(res, 403, { error: READ_ONLY });
    if (updating) return json(res, 409, { error: 'Aktualizacja już trwa.' });
    const { plan } = updatePlanNow();
    if (plan.error) return json(res, 409, { error: plan.error });
    updating = true;
    return update.runPlan(plan.steps, process.env).then(r => {
      updating = false;
      json(res, 200, Object.assign(r, { disk: diskVersion(), plugin: pluginVersion(), running: VERSION }));
    });
  }
  if (url === '/api/version' && req.method === 'GET') return json(res, 200, { running: VERSION, disk: diskVersion(), plugin: pluginVersion() });
  if (url === '/api/progress' && req.method === 'GET') return json(res, 200, progressPayload(ctx));
  if (url === '/progress-events') return sse(req, res, ctx.progressClients, progressPayload(ctx));
  if (url === '/api/board' && req.method === 'GET') return json(res, 200, boardView(ctx));
  if (url === '/events') return sse(req, res, ctx.boardClients, boardView(ctx));
  if (url === '/api/guide' && req.method === 'GET') return json(res, 200, info.guide());
  if (url === '/api/config' && req.method === 'GET') return json(res, 200, configView(ctx));
  if (url === '/api/module' && req.method === 'GET') {
    if (!ctx.req || !fs.existsSync(ctx.req)) return json(res, 409, { error: 'Nie wybrano modułu.' });
    const m = info.moduleSummary(ctx.req);
    m.dir = ctx.demo ? '' : path.dirname(ctx.req);
    return json(res, 200, m);
  }

  // Pobranie pliku z listy Intake (0.20.0). Zwykly link nie wysle X-SDD, wiec tylko Host lokalny; demo tez (to odczyt).
  if (url === '/api/intake' && req.method === 'GET') {
    if (!localHost(req)) return json(res, 403, { error: 'Tylko z panelu sdd-board.' });
    let file;
    try { file = intakeFile(ctx.req || '', u.searchParams.get('name') || ''); }
    catch (e) { return json(res, 404, { error: e.message }); }
    const base = path.basename(file);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': fs.statSync(file).size,
      'Content-Disposition': "attachment; filename=\"" + base.replace(/[^\x20-\x7e]|["\\]/g, '_') + "\"; filename*=UTF-8''" + encodeURIComponent(base),
      'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(file).pipe(res);
  }

  // ponizej tylko Twoj kontekst (demo odpadlo wyzej na zapisach)
  if (url === '/api/intake' && req.method === 'POST') {
    const name = u.searchParams.get('name') || '';
    if (!user.req || !fs.existsSync(user.req)) return json(res, 409, { error: 'Brak requirements/ w tym module.' });
    return readBody(req, MAX_UPLOAD, buf => {
      if (!buf) return json(res, 413, { error: 'Plik wiekszy niz 25 MB.' });
      try {
        const r = saveIntake(user.req, name, buf);
        json(res, r.saved ? 201 : 200, r);
      }
      catch (e) { json(res, 500, { error: e.message }); }
    });
  }

  if (url === '/api/intake' && req.method === 'DELETE') {
    if (!user.req) return json(res, 409, { error: 'Nie wybrano modułu.' });
    try { return json(res, 200, { removed: removeIntake(user.req, u.searchParams.get('name') || '') }); }
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
        ROOT = dir; ROOT_SOURCE = 'config';
        selectModule(user, user.req && inside(user.req, dir) ? user.req : firstModule());
        json(res, 200, { modulesRoot: dir, module: user.req ? moduleName(user) : null });
      } catch (e) { json(res, 400, { error: e.message }); }
    });
  }
  if (url === '/api/root/preview' && req.method === 'GET') {
    try {
      const dir = path.resolve(String(u.searchParams.get('path') || ''));
      return json(res, 200, { path: dir, exists: fs.existsSync(dir), hidden: info.rootPreview(modulesOf(user), dir),
        visible: listModules(dir).map(m => m.name) });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  if (url === '/api/config' && req.method === 'PUT') {
    return readBody(req, 64 * 1024, buf => {
      let body;
      try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { return json(res, 400, { error: 'zly JSON' }); }
      const r = saveSdd(user, body);
      if (r.code !== 200) return json(res, r.code, { error: r.error, blocked: r.blocked });
      broadcastProgress(user);
      json(res, 200, configView(user));
    });
  }
  // Usuniecie projektu z listy dodanych recznie - tylko wpis w config.json, folder zostaje (AC-C10).
  if (url === '/api/modules' && req.method === 'DELETE') {
    const dir = path.resolve(String(u.searchParams.get('dir') || ''));
    const cfg = readConfig(CONFIG), list = Array.isArray(cfg.modules) ? cfg.modules : [];
    if (!list.some(d => typeof d === 'string' && path.resolve(d) === dir)) return json(res, 404, { error: 'Nie ma takiego projektu na liście.' });
    writeConfig(CONFIG, { modules: list.filter(d => typeof d !== 'string' || path.resolve(d) !== dir) });
    if (user.req && !modulesOf(user).some(m => path.join(m.dir, 'requirements') === user.req)) selectModule(user, firstModule());
    else send(user.progressClients, progressPayload(user));
    return json(res, 200, configView(user));
  }
  if (url === '/api/modules' && req.method === 'POST') {
    if (!ROOT) return json(res, 409, { error: 'Najpierw wskaż katalog modułów.' });
    return readBody(req, 64 * 1024, buf => {
      try {
        const body = JSON.parse(String(buf || '{}'));
        const dir = createModule(ROOT, body);
        selectModule(user, path.join(dir, 'requirements'));
        json(res, 201, { name: path.basename(dir), dir });
      } catch (e) { json(res, 400, { error: e.message }); }
    });
  }
  if (url === '/api/modules/add' && req.method === 'POST') {
    return readBody(req, 64 * 1024, buf => {
      try {
        const dir = addModule(CONFIG, JSON.parse(String(buf || '{}')).path);
        selectModule(user, path.join(dir, 'requirements'));
        json(res, 200, { name: path.basename(dir), dir });
      } catch (e) { json(res, 400, { error: e.message }); }
    });
  }
  if (url === '/api/modules/select' && req.method === 'POST') {
    return readBody(req, 64 * 1024, buf => {
      let body = {};
      try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { /* zly JSON */ }
      // po sciezce (0.13.0), nazwa dla zgodnosci
      const m = body.dir ? modulesOf(user).find(x => x.dir === path.resolve(String(body.dir)))
        : modulesOf(user).find(x => x.name === body.name);
      if (!m) return json(res, 404, { error: 'Nie ma modulu ' + (body.dir || body.name || '') });
      selectModule(user, path.join(m.dir, 'requirements'));
      json(res, 200, { name: m.name });
    });
  }

  if (url === '/api/board' && req.method === 'PUT') {
    if (!user.board) return json(res, 409, { error: 'Nie wybrano modułu.' });
    return readBody(req, 5 * 1024 * 1024, buf => {
      try { writeBoard(user, stampNotes(readBoard(user), JSON.parse(String(buf)), new Date().toISOString())); res.writeHead(204); res.end(); }
      catch (e) { res.writeHead(400); res.end('zly JSON'); }
    });
  }
  res.writeHead(404); res.end();
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} jest zajęty - pewnie działa już sdd-board. Demo jest pod http://localhost:${PORT}/demo.`);
    console.error('Inny port: sdd-board <plik tablicy> <port>, np. sdd-board requirements/01-interview/board.json 8014');
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Panel:    http://localhost:${PORT}`);
  console.log(`Tablica:  http://localhost:${PORT}/board`);
  console.log(`Demo:     http://localhost:${PORT}/demo  (start warsztatu: /demo/start)`);
  console.log(`Modul:    ${user.req ? path.dirname(user.req) : 'brak'}`);
  if (resolved.rejected) console.log(`Pomijam:  ${resolved.rejected} - to folder aplikacji sdd-kit, wymagan tu nie trzymam.`);
  console.log(`Moduly w: ${ROOT || 'nie wybrano - wskaz katalog w panelu'}`);
  console.log('Zostaw to okno otwarte. Ctrl+C konczy.');
});

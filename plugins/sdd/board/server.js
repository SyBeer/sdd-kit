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
const { listSessions } = require('./session-mark');  // wersja skilli w sesjach Claude Code (0.32.0)
const { KIT_DIR, configPath, inside, readConfig, writeConfig, saveRoot, addModule, checkRoot, resolveRoot, listDirs, pluginVersion } = require('./root');
const info = require('./info');
const terminal = require('./terminal');
const chat = require('./chat');
// DYKTOWANIE (0.38.0) start
const dictate = require('./dictate');
// DYKTOWANIE (0.38.0) koniec
const update = require('./update');
const secrets = require('./secrets');
const repoCopy = require('./repo-copy');  // kopia wymagan w repozytorium (0.41.0, docs/specs/repo-copy.md)

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
    boardClients: new Set(), progressClients: new Set(), watchers: [], retry: null, btimer: null, ptimer: null,
    copier: null, copy: null };
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
  b._copy = ctx.copy; // stan kopii w pasku stanu (0.41.0, AC-RC10)
  return b;
}
const VIEW_ONLY = ['_sync', '_module', '_modules', '_demo', '_file', '_questions', '_copy'];
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
  p.copy = ctx.copy;
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
      if (ctx.copier) ctx.copier.touch();  // kopia po ciszy (0.41.0)
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
  setupCopy(ctx);
  watch(ctx);
  send(ctx.progressClients, progressPayload(ctx));
  send(ctx.boardClients, boardView(ctx));
  if (ctx === user) { termSwitch(); chatSwitch(); }
}
// ---------------------------------------------------------------- kopia w repozytorium (0.41.0, docs/specs/repo-copy.md)
// Kopista Twojego modulu: po zmianie plikow (cisza 2 min), przy starcie i wyborze modulu od razu. Tryb z SDD.yaml przy
// kazdym przejsciu. Demo bez kopii. Stan liczony po zdarzeniu (kazde pytanie do gita to osobny proces).
const COPY_DELAY = parseInt(process.env.SDD_COPY_DELAY_MS || '120000', 10) || 120000;
function copyModeOf(ctx) {
  try { return repoCopy.copyMode(fs.readFileSync(path.join(ctx.req, 'SDD.yaml'), 'utf8')); } catch (e) { return 'local'; }
}
function setupCopy(ctx) {
  // poprzedni modul: ostatnia kopia od razu (zmiany sprzed 2 min ciszy nie czekaja do nastepnego startu)
  if (ctx.copier) { ctx.copier.now(); ctx.copier.stop(); ctx.copier = null; }
  ctx.copy = null;
  if (ctx.demo || ctx !== user || !ctx.req || process.env.SDD_COPY === '0') return;
  const c = repoCopy.createCopier(path.dirname(ctx.req), { delayMs: COPY_DELAY, mode: () => copyModeOf(ctx),
    onChange: st => { if (ctx.copier !== c) return; ctx.copy = st; broadcastProgress(ctx); broadcastBoard(ctx); } });
  ctx.copier = c;
  c.now();
}
async function copyView(ctx) {
  const dir = path.dirname(ctx.req), mode = copyModeOf(ctx);
  const [repo, versions] = await Promise.all([repoCopy.repoState(dir), repoCopy.listVersions(dir)]);
  const status = ctx.copier && ctx.copier.status() || await repoCopy.copyStatus(dir, mode);
  return { mode, repo, status, versions, skipped: ctx.copier ? ctx.copier.skipped() : [] };
}
function copyRoute(ctx, req, res, url) {
  if (!ctx.req || ctx.demo && req.method === 'GET') return json(res, 409, { error: ctx.demo ? READ_ONLY : 'Nie wybrano modułu.' });
  const fail = e => json(res, 500, { error: String(e && e.message || e) });
  if (url === '/api/copy' && req.method === 'GET') return copyView(ctx).then(v => json(res, 200, v), fail);
  if (!ctx.copier) return json(res, 409, { error: 'Kopia jest wyłączona (SDD_COPY=0).' });
  if (url === '/api/copy/now' && req.method === 'POST') return ctx.copier.now().then(() => copyView(ctx)).then(v => json(res, 200, v), fail);
  if (url === '/api/copy/version' && req.method === 'POST') {
    return readBody(req, 16 * 1024, buf => {
      let body = {};
      try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { /* zly JSON = pusta nazwa */ }
      ctx.copier.version(String(body.name || '')).then(r => {
        if (!r.ok) return json(res, 409, { error: r.error });
        return copyView(ctx).then(v => json(res, 200, Object.assign(v, { version: r })));
      }).catch(fail);
    });
  }
  // Pokaz zmiany / Przywroc (0.42.0, docs/specs/version-restore.md AC-VR4)
  if (url === '/api/copy/diff' && req.method === 'GET') {
    const tag = new URL(req.url, 'http://localhost').searchParams.get('tag') || '';
    return ctx.copier.diff(tag).then(r => r.ok ? json(res, 200, r) : json(res, 409, { error: r.error }), fail);
  }
  if (url === '/api/copy/restore' && req.method === 'POST') {
    return readBody(req, 16 * 1024, buf => {
      let body = {};
      try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { /* zly JSON = brak wersji */ }
      ctx.copier.restore(String(body.tag || '')).then(r => {
        if (!r.ok) return json(res, 409, { error: r.error });
        return copyView(ctx).then(v => json(res, 200, Object.assign(v, { restore: r })));
      }).catch(fail);
    });
  }
  return json(res, 404, { error: 'Nie ma takiej operacji.' });
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
    const owners = info.parseOwners(y);
    // usedRoles (0.34.0, AC-F7): role, ktorych nazwa stoi w plikach - Konfiguracja nie pozwala ich usunac (ta sama regula co przy zapisie)
    sdd = { project: info.yamlField(y, 'project'), level: info.yamlField(y, 'level') || 'full', owners,
      usedRoles: info.roleChangeBlocked(ctx.req, owners, []).map(b => b.role),
      kind: info.yamlField(y, 'kind') === 'service' ? 'service' : 'monolith', kindsAllowed: info.KINDS,
      // styl rozmowy wywiadu (0.37.0, AC-IS2): brak pola = biz
      interviewStyle: info.yamlField(y, 'interview_style') === 'inz' ? 'inz' : 'biz', stylesAllowed: info.STYLES,
      copy: info.copyMode(y), copiesAllowed: info.COPIES,  // kopia w repozytorium (0.41.0, AC-RC10)
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
    // DYKTOWANIE (0.38.0) start
    dictateKeys: demo ? '' : String(cfg.dictateKeys || ''), dictate: !demo && dictate.enabled(process.env, process.platform),
    // DYKTOWANIE (0.38.0) koniec
    sdd,
    // Klucz Redmine: tylko skad jest, nigdy wartosc (AC-S3)
    redmineKey: demo ? 'none' : secrets.redmineKey().source,
    server: demo ? { version: VERSION, port: PORT } : { version: VERSION, port: PORT, board: ctx.board || '', config: CONFIG },
  };
}
function localDate() {
  const d = new Date(), z = v => (v < 10 ? '0' : '') + v;
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
// Zmiana SDD.yaml z panelu: project, backlog, owners, kind (level i gate zmienia Claude - AC-C9).
function saveSdd(ctx, body) {
  const allowed = ['project', 'backlog', 'owners', 'redmine_url', 'redmine_project', 'kind', 'interview_style', 'copy'];
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
// Sesja na modul (0.34.2, AC-T16): okno pokazuje sesje biezacego modulu; po zmianie modulu sesja poprzedniego dziala
// dalej w tle i wraca po powrocie do niego. Tylko Twoj modul, tylko Host lokalny.
var terms = new Map();   // folder modulu -> TermSession (var: selectModule przy starcie wola termSwitch przed ta linia)
const termClients = new Set();
const termSend = (res, obj, ev) => res.write((ev ? 'event: ' + ev + '\n' : '') + 'data: ' + JSON.stringify(obj) + '\n\n');
function termKey() { return user.req ? path.dirname(user.req) : ''; }
function termOf(key) {
  let t = terms.get(key);
  if (t) return t;
  t = new terminal.TermSession();
  t.on('data', c => { if (key !== termKey()) return; const d = c.toString('base64'); termClients.forEach(r => termSend(r, { d })); });
  t.on('exit', code => { if (key === termKey()) termClients.forEach(r => termSend(r, { code }, 'exit')); });
  terms.set(key, t);
  return t;
}
const term = { get cur() { return termOf(termKey()); } };
// Zmiana modulu: okna Claude dostaja ekran i stan sesji nowego modulu (jak po ponownym podlaczeniu)
function termSwitch() {
  if (!terms) return;
  termClients.forEach(r => termSend(r, { replay: true, d: term.cur.buffer().toString('base64'), state: termState() }));
}
// Inne moduly z dzialajaca sesja - okno pokazuje, ze Claude dziala tez gdzie indziej
function termOthers() {
  const k = termKey(), out = [];
  terms.forEach((t, key) => { if (key !== k && t.state().running) out.push(key); });
  return out;
}
function termState() {
  const mod = user.req ? path.dirname(user.req) : null;
  // zapisana rozmowa Claude Code w folderze modulu -> mozna wznowic po restarcie serwera (AC-T12)
  let canResume = false;
  if (mod) { try { canResume = terminal.hasHistory(fs.realpathSync(mod)); } catch (e) { canResume = false; } }
  // platform / windowsBuild: przegladarka ustawia xterm pod ConPTY; reason: dlaczego terminal niedostepny (AC-W11)
  const av = terminal.availability();
  return Object.assign(term.cur.state(), { others: termOthers(), available: av.ok, reason: av.reason, platform: process.platform,
    windowsBuild: process.platform === 'win32' ? terminal.windowsBuild(require('os').release()) : null, module: mod, canResume });
}
['exit', 'SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => { terms.forEach(t => t.stop()); chats.forEach(c => c.stop()); if (sig !== 'exit') process.exit(0); }));
function termRoute(req, res, url) {
  if (!localHost(req)) return json(res, 403, { error: 'Tylko z panelu sdd-board.' });
  if (url === '/api/term' && req.method === 'GET') return json(res, 200, termState());
  if (url === '/term-events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    termSend(res, { replay: true, d: term.cur.buffer().toString('base64'), state: termState() });
    termClients.add(res);
    return req.on('close', () => termClients.delete(res));
  }
  if (req.method !== 'POST') return json(res, 404, { error: 'Nie ma takiego adresu.' });
  return readBody(req, 1024 * 1024, buf => {
    let body = {};
    try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { return json(res, 400, { error: 'zly JSON' }); }
    if (url === '/api/term/start') {
      if (!terminal.available()) return json(res, 501, { error: terminal.availability().reason });
      if (!user.req) return json(res, 409, { error: 'Najpierw wybierz moduł.' });
      chatOf(termKey()).stop();  // jedna rozmowa na modul: czat konczy sie, rozmowa wraca w terminalu (--continue)
      try { term.cur.start({ cwd: path.dirname(user.req), cols: body.cols, rows: body.rows, resume: body.resume === true,
        args: ['--append-system-prompt', chat.STYLE_PROMPT.inz] }); }
      catch (e) { return json(res, 500, { error: e.message }); }
      return json(res, 200, termState());
    }
    if (url === '/api/term/input') { term.cur.write(String(body.data || '')); return json(res, 200, { ok: true }); }
    if (url === '/api/term/resize') { return json(res, 200, { ok: true, sent: term.cur.resize(body.cols, body.rows, body.force === true) }); }
    if (url === '/api/term/stop') { term.cur.stop(); return json(res, 200, { ok: true }); }
    json(res, 404, { error: 'Nie ma takiego adresu.' });
  });
}

// ---------------------------------------------------------------- okno Claude jako czat (0.38.0, docs/specs/claude-chat.md)
// Sesja czatu na modul jak terminal (AC-T16); jedna rozmowa na modul - start czatu konczy terminal i odwrotnie.
var chats = new Map();   // folder modulu -> ChatSession (var: selectModule przy starcie wola chatSwitch przed ta linia)
const chatClients = new Set();
function chatOf(key) {
  let c = chats.get(key);
  if (c) return c;
  c = new chat.ChatSession();
  c.on('event', ev => { if (key === termKey()) chatClients.forEach(r => termSend(r, { ev, state: chatState() })); });
  chats.set(key, c);
  return c;
}
function chatState() {
  const t = termState();
  return Object.assign(chatOf(termKey()).state(), { module: t.module, canResume: t.canResume, termRunning: t.running,
    // DYKTOWANIE (0.38.0) start
    dictate: dictate.enabled(process.env, process.platform),
    // DYKTOWANIE (0.38.0) koniec
  });
}
function chatSwitch() {
  if (!chats) return;
  chatClients.forEach(r => termSend(r, { replay: true, log: chatOf(termKey()).log(), state: chatState() }));
}
function chatRoute(req, res, url) {
  if (!localHost(req)) return json(res, 403, { error: 'Tylko z panelu sdd-board.' });
  if (url === '/api/chat' && req.method === 'GET') return json(res, 200, chatState());
  if (url === '/chat-events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    termSend(res, { replay: true, log: chatOf(termKey()).log(), state: chatState() });
    chatClients.add(res);
    return req.on('close', () => chatClients.delete(res));
  }
  if (req.method !== 'POST') return json(res, 404, { error: 'Nie ma takiego adresu.' });
  return readBody(req, 256 * 1024, buf => {
    let body = {};
    try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { return json(res, 400, { error: 'zly JSON' }); }
    const c = chatOf(termKey());
    if (url === '/api/chat/start') {
      if (!user.req) return json(res, 409, { error: 'Najpierw wybierz moduł.' });
      term.cur.stop();  // jedna rozmowa na modul: terminal konczy sie, rozmowa wraca w czacie (--continue)
      const mod = path.dirname(user.req);
      let resume = body.resume === true;
      if (body.resume === undefined) { try { resume = terminal.hasHistory(fs.realpathSync(mod)); } catch (e) { resume = false; } }
      try { c.start({ cwd: mod, resume, style: 'biz' }); } catch (e) { return json(res, 500, { error: e.message }); }
      return json(res, 200, chatState());
    }
    if (url === '/api/chat/send') {
      if (!c.send(body.text)) return json(res, 409, { error: c.state().running ? 'Pusta wiadomość.' : 'Czat nie działa - uruchom go.' });
      return json(res, 200, { ok: true });
    }
    if (url === '/api/chat/stop') { c.stop(); return json(res, 200, { ok: true }); }
    // DYKTOWANIE (0.38.0) start
    if (url === '/api/chat/dictate') {
      if (!dictate.enabled(process.env, process.platform)) return json(res, 404, { error: 'Dyktowanie wyłączone.' });
      // wlasny skrot programu do dyktowania (0.39.1, AC-CH11) z ~/.sdd-kit/config.json, np. Superwhisper option+space
      return dictate.run(process.platform, { keys: readConfig(CONFIG).dictateKeys }).then(r => json(res, r.ok ? 200 : 500, r)).catch(e => json(res, 500, { ok: false, error: e.message }));
    }
    if (url === '/api/chat/dictate-keys') {
      const keys = String(body.keys || '').trim();
      if (keys && !dictate.parseKeys(keys)) return json(res, 400, { error: 'Nie rozumiem skrótu „' + keys + '”. Przykłady: option+space, ctrl+alt+d, f5.' });
      try { writeConfig(CONFIG, { dictateKeys: keys || undefined }); } catch (e) { return json(res, 500, { error: e.message }); }
      return json(res, 200, { ok: true, dictateKeys: keys });
    }
    // DYKTOWANIE (0.38.0) koniec
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
// Ikona aplikacji (0.28.11, AC-U18): adres -> [plik, typ]; /favicon.ico to PNG (przegladarki pytaja o ten adres same)
const ICONS = { '/favicon.svg': ['favicon.svg', 'image/svg+xml'], '/favicon.png': ['favicon.png', 'image/png'],
  '/favicon.ico': ['favicon.png', 'image/png'], '/apple-touch-icon.png': ['apple-touch-icon.png', 'image/png'] };

// Czcionki IBM Plex (0.33.0, AC-B54): tylko pliki .woff2 z board/fonts/, nazwa bez sciezki
const FONT = /^\/fonts\/(ibm-plex-[a-z0-9-]+\.woff2)$/;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const fm = FONT.exec(u.pathname);
  if (fm) {
    const f = path.join(__dirname, 'fonts', fm[1]);
    if (!fs.existsSync(f)) return json(res, 404, { error: 'Brak czcionki.' });
    res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'max-age=604800' });
    return fs.createReadStream(f).pipe(res);
  }
  if (ICONS[u.pathname]) {
    res.writeHead(200, { 'Content-Type': ICONS[u.pathname][1], 'Cache-Control': 'max-age=86400' });
    return fs.createReadStream(path.join(__dirname, ICONS[u.pathname][0])).pipe(res);
  }
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
  if (url === '/api/copy' || url.startsWith('/api/copy/')) return copyRoute(ctx, req, res, url);
  if (url === '/api/chat' || url.startsWith('/api/chat/') || url === '/chat-events') {
    if (ctx.demo) return json(res, 403, { error: READ_ONLY });
    return chatRoute(req, res, url);
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
  if (url === '/api/version' && req.method === 'GET') {
    const plugin = pluginVersion();
    return json(res, 200, { running: VERSION, disk: diskVersion(), plugin,
      sessions: ctx.demo ? [] : listSessions({ plugin: plugin || diskVersion() }), platform: process.platform });
  }
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
  // Klucze API do ~/.sdd-kit/.env (0.28.5, docs/specs/secrets.md): tylko zapis, odpowiedz bez wartosci
  if (url === '/api/secrets' && req.method === 'PUT') {
    return readBody(req, 16 * 1024, buf => {
      let body;
      try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { return json(res, 400, { error: 'zly JSON' }); }
      const keys = Object.keys(body);
      const bad = keys.filter(k => secrets.KNOWN.indexOf(k) < 0);
      if (!keys.length || bad.length) return json(res, 400, { error: 'Dozwolone klucze: ' + secrets.KNOWN.join(', ') + '.' });
      try { keys.forEach(k => secrets.writeSecret(k, body[k])); } catch (e) { return json(res, 400, { error: e.message }); }
      json(res, 200, configView(user));
    });
  }
  if (url === '/api/config' && req.method === 'PUT') {
    return readBody(req, 64 * 1024, buf => {
      let body;
      try { body = JSON.parse(String(buf || '{}')) || {}; } catch (e) { return json(res, 400, { error: 'zly JSON' }); }
      const r = saveSdd(user, body);
      if (r.code !== 200) return json(res, r.code, { error: r.error, blocked: r.blocked });
      if ('copy' in body && user.copier) user.copier.now();  // wlaczenie wysylki od razu wysyla (AC-RC10)
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

// IPv6 (0.34.1, AC-T15): Windows rozwiazuje "localhost" najpierw na ::1. Serwer tylko na 127.0.0.1 = kazde nowe polaczenie
// czeka ~2 s na odmowe z ::1, zanim przegladarka sprobuje IPv4 (wolne przelaczanie zakladek). Drugi nasluch na ::1 -
// nadal tylko lokalnie. Brak IPv6 albo port zajety na ::1 nie zatrzymuje serwera.
function listen6() {
  const s6 = http.createServer((req, res) => server.emit('request', req, res));
  s6.on('error', e => {
    if (e.code === 'EADDRINUSE') console.error(`Uwaga: port ${PORT} na ::1 zajmuje inny program - otwieraj http://127.0.0.1:${PORT}`);
  });
  s6.listen(PORT, '::1');
}

server.listen(PORT, '127.0.0.1', () => {
  listen6();
  console.log(`Panel:    http://localhost:${PORT}`);
  console.log(`Tablica:  http://localhost:${PORT}/board`);
  console.log(`Demo:     http://localhost:${PORT}/demo  (start warsztatu: /demo/start)`);
  console.log(`Modul:    ${user.req ? path.dirname(user.req) : 'brak'}`);
  if (resolved.rejected) console.log(`Pomijam:  ${resolved.rejected} - to folder aplikacji sdd-kit, wymagan tu nie trzymam.`);
  console.log(`Moduly w: ${ROOT || 'nie wybrano - wskaz katalog w panelu'}`);
  console.log('Zostaw to okno otwarte. Ctrl+C konczy.');
});

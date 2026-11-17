// Moduly spoza katalogu i zapamietany ostatni modul. Kryteria z docs/specs/progress-ui.md, zmiana 0.13.0 (AC-50, AC-51).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { createModule } = require('../modules');
const { readConfig, saveRoot, writeConfig } = require('../root');

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ext-')));
function freePort() {
  return new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function call(port, method, url, body) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: { 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' } }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
// Serwer uruchomiony w folderze bez projektu (jak konfiguracja podgladu w katalogu modulow).
async function start(cfg, cwd, extra = {}) {
  const port = await freePort();
  const env = Object.assign({}, process.env, { SDD_CONFIG: cfg, SDD_PLUGINS_FILE: path.join(os.tmpdir(), 'sdd-brak-pluginow.json') }, extra);
  delete env.SDD_MODULES_ROOT; delete env.SDD_REQ;
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'server.js'), 'requirements/01-interview/board.json', String(port)], { cwd, env });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  return { port, proc };
}
const progress = async port => JSON.parse((await call(port, 'GET', '/api/progress')).body);

test('AC-50: POST /api/modules/add - modul spoza katalogu na liscie, wybrany i zapamietany', async () => {
  const root = tmp(), other = tmp(), cfg = path.join(tmp(), 'config.json');
  createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  const app = createModule(other, { name: 'fv-manager', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  const { port, proc } = await start(cfg, tmp());
  try {
    assert.strictEqual((await progress(port)).module, null, 'start poza modulem - pytanie (AC-80)');
    const bad = await call(port, 'POST', '/api/modules/add', JSON.stringify({ path: other }));
    assert.strictEqual(bad.code, 400);
    assert.match(bad.body, /sdd:init/);
    const r = await call(port, 'POST', '/api/modules/add', JSON.stringify({ path: app }));
    assert.strictEqual(r.code, 200, r.body);
    const p = await progress(port);
    assert.strictEqual(p.module.dir, app);
    const m = p.modules.find(x => x.dir === app);
    assert.ok(m && m.external);
    assert.ok(p.modules.some(x => x.name === 'horizon'));
    assert.deepStrictEqual(readConfig(cfg).modules, [app]);
    assert.strictEqual(readConfig(cfg).lastModule, app);
    // wybor po sciezce
    const s = await call(port, 'POST', '/api/modules/select', JSON.stringify({ dir: path.join(root, 'horizon') }));
    assert.strictEqual(s.code, 200, s.body);
    assert.strictEqual(readConfig(cfg).lastModule, path.join(root, 'horizon'));
  } finally { proc.kill(); }
});

// AC-51 (otwieral lastModule sam) zastapione w 0.49.0 przez AC-80..AC-82 (R-003, D-010)
test('AC-80 (AC-003-1), AC-81 (AC-003-2): start poza modulem - zaden modul, pytanie z ostatnim; wybor otwiera', async () => {
  const root = tmp(), other = tmp(), cfg = path.join(tmp(), 'config.json');
  createModule(root, { name: 'alfa', level: 'full' }, { git: false });
  createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  const app = createModule(other, { name: 'fv-manager', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  writeConfig(cfg, { modules: [app], lastModule: app });
  let s = await start(cfg, tmp());
  try {
    const p = await progress(s.port);
    assert.strictEqual(p.module, null, 'zaden modul nie jest otwarty');
    assert.deepStrictEqual(p.lastModule, { name: 'fv-manager', dir: app });
    assert.deepStrictEqual(p.modules.map(m => m.name).sort(), ['alfa', 'fv-manager', 'horizon']);
    const r = await call(s.port, 'POST', '/api/modules/select', JSON.stringify({ dir: p.lastModule.dir }));
    assert.strictEqual(r.code, 200, r.body);
    assert.strictEqual((await progress(s.port)).module.dir, app, '"ostatni" otwiera modul uzywany ostatnio');
  } finally { s.proc.kill(); }
  writeConfig(cfg, { lastModule: path.join(other, 'usuniety') });
  s = await start(cfg, tmp());
  try {
    const p = await progress(s.port);
    assert.strictEqual(p.module, null);
    assert.strictEqual(p.lastModule, null, 'zapamietanego modulu juz nie ma');
  } finally { s.proc.kill(); }
});

test('AC-82 (AC-003-3): start w folderze modulu otwiera ten modul bez pytania, mimo innego lastModule', async () => {
  const root = tmp(), cfg = path.join(tmp(), 'config.json');
  const alfa = createModule(root, { name: 'alfa', level: 'full' }, { git: false });
  const horizon = createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  writeConfig(cfg, { lastModule: horizon });
  const s = await start(cfg, alfa);
  try { assert.strictEqual((await progress(s.port)).module.dir, alfa); } finally { s.proc.kill(); }
});

test('AC-80 (AC-003-1): startChoiceHtml - ostatni z nazwa, lista, nowy; progress.html go uzywa', () => {
  const ui = require('../ui.js');
  const h = ui.startChoiceHtml({ lastModule: { name: 'fv-manager', dir: '/a/fv' }, modules: [{ name: 'alfa', dir: '/r/alfa' }, { name: 'fv-manager', dir: '/a/fv', external: true }] });
  const t = h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  assert.match(t, /Który moduł otworzyć\?/);
  assert.match(t, /Załaduj ostatni: fv-manager/);
  assert.match(h, /data-dir="\/a\/fv"/);
  assert.match(h, /data-dir="\/r\/alfa"/);
  assert.match(h, /id="newmod2"/);
  assert.match(h, /id="addproj2"/);
  assert.doesNotMatch(ui.startChoiceHtml({ lastModule: null, modules: [{ name: 'alfa', dir: '/r/alfa' }] }), /Załaduj ostatni/);
  assert.match(ui.startChoiceHtml({ lastModule: null, modules: [{ name: '<x>', dir: '/r/x' }] }), /&lt;x&gt;/);
  const p = fs.readFileSync(path.join(__dirname, '..', 'progress.html'), 'utf8');
  assert.match(p, /SddUI\.startChoiceHtml\(p\)/);
  assert.match(p, /\/api\/modules\/select/);
});

test('AC-B37: widok tablicy podaje _file, zapis go pomija', async () => {
  const root = tmp(), cfg = path.join(tmp(), 'config.json');
  const dir = createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  const { port, proc } = await start(cfg, dir);  // w folderze modulu - od 0.49.0 poza nim panel pyta (AC-80)
  try {
    const file = path.join(dir, 'requirements', '01-interview', 'board.json');
    const b = JSON.parse((await call(port, 'GET', '/api/board')).body);
    assert.strictEqual(b._file, file);
    const put = await call(port, 'PUT', '/api/board', JSON.stringify({ lanes: ['A'], notes: [], _file: '/inny/plik.json' }));
    assert.strictEqual(put.code, 204);
    assert.strictEqual('_file' in JSON.parse(fs.readFileSync(file, 'utf8')), false);
  } finally { proc.kill(); }
});

test('AC-B40: widok tablicy podaje _questions, zapis go pomija', async () => {
  const root = tmp(), cfg = path.join(tmp(), 'config.json');
  const dir = createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  fs.appendFileSync(path.join(dir, 'requirements', '01-interview', 'QUESTIONS.md'), '| Q-001 | Maile? | otwarte | sponsor | BR-030 | | |\n');
  saveRoot(cfg, root);
  const { port, proc } = await start(cfg, dir);  // w folderze modulu - od 0.49.0 poza nim panel pyta (AC-80)
  try {
    const b = JSON.parse((await call(port, 'GET', '/api/board')).body);
    assert.strictEqual(b._questions['Q-001'].kind, 'open');
    assert.deepStrictEqual(b._questions['Q-001'].refs, ['BR-030']);
    await call(port, 'PUT', '/api/board', JSON.stringify({ lanes: [], notes: [], _questions: b._questions }));
    const file = path.join(dir, 'requirements', '01-interview', 'board.json');
    assert.strictEqual('_questions' in JSON.parse(fs.readFileSync(file, 'utf8')), false);
  } finally { proc.kill(); }
});

test('AC-U11: GET /api/version - wersja przy starcie i na dysku', async () => {
  const root = tmp(), cfg = path.join(tmp(), 'config.json');
  createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  const want = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.claude-plugin', 'plugin.json'), 'utf8')).version;
  const { port, proc } = await start(cfg, tmp(), { SDD_SESSIONS_DIR: path.join(tmp(), 'sessions') });  // sesje: 0.32.0
  try {
    for (const u of ['/api/version', '/demo/api/version']) {
      const r = await call(port, 'GET', u);
      assert.strictEqual(r.code, 200, u);
      const j = JSON.parse(r.body);
      // restart (0.46.0, AC-VP6): komenda restartu serwera; w demo pusta
      assert.strictEqual(u.startsWith('/demo') ? j.restart === '' : /server\.js/.test(j.restart), true, u);
      delete j.restart;
      // odcisk skilli (0.46.1, AC-SV16)
      assert.match(j.skills, /^[0-9a-f]{12}$/); assert.strictEqual(typeof j.skillsChanged, 'boolean');
      delete j.skills; delete j.skillsChanged;
      assert.deepStrictEqual(j, { running: want, disk: want, plugin: '', sessions: [], platform: process.platform });
    }
  } finally { proc.kill(); }
});

test('AC-U14: GET /api/version - wersja pluginu w Claude Code, czytana przy kazdym zapytaniu', async () => {
  const root = tmp(), cfg = path.join(tmp(), 'config.json'), pf = path.join(tmp(), 'installed_plugins.json');
  createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  const put = (v) => fs.writeFileSync(pf, JSON.stringify({ version: 2, plugins: { 'sdd@sdd-kit': [{ scope: 'user', version: v }] } }));
  put('0.19.0');
  const { port, proc } = await start(cfg, tmp(), { SDD_PLUGINS_FILE: pf });
  try {
    for (const u of ['/api/version', '/demo/api/version']) assert.strictEqual(JSON.parse((await call(port, 'GET', u)).body).plugin, '0.19.0', u);
    put('0.20.0');
    assert.strictEqual(JSON.parse((await call(port, 'GET', '/api/version')).body).plugin, '0.20.0');
  } finally { proc.kill(); }
});

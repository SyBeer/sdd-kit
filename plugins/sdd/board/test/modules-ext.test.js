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
async function start(cfg, cwd) {
  const port = await freePort();
  const env = Object.assign({}, process.env, { SDD_CONFIG: cfg });
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
    assert.strictEqual((await progress(port)).module.name, 'horizon');
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

test('AC-51: start bez projektu w folderze - lastModule, a gdy go nie ma - pierwszy z listy', async () => {
  const root = tmp(), other = tmp(), cfg = path.join(tmp(), 'config.json');
  createModule(root, { name: 'alfa', level: 'full' }, { git: false });
  createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  const app = createModule(other, { name: 'fv-manager', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  writeConfig(cfg, { modules: [app], lastModule: app });
  let s = await start(cfg, tmp());
  try { assert.strictEqual((await progress(s.port)).module.dir, app); } finally { s.proc.kill(); }
  writeConfig(cfg, { lastModule: path.join(root, 'horizon') });
  s = await start(cfg, tmp());
  try { assert.strictEqual((await progress(s.port)).module.name, 'horizon'); } finally { s.proc.kill(); }
  writeConfig(cfg, { lastModule: path.join(other, 'usuniety') });
  s = await start(cfg, tmp());
  try { assert.strictEqual((await progress(s.port)).module.name, 'alfa'); } finally { s.proc.kill(); }
});

test('AC-B37: widok tablicy podaje _file, zapis go pomija', async () => {
  const root = tmp(), cfg = path.join(tmp(), 'config.json');
  const dir = createModule(root, { name: 'horizon', level: 'full' }, { git: false });
  saveRoot(cfg, root);
  const { port, proc } = await start(cfg, tmp());
  try {
    const file = path.join(dir, 'requirements', '01-interview', 'board.json');
    const b = JSON.parse((await call(port, 'GET', '/api/board')).body);
    assert.strictEqual(b._file, file);
    const put = await call(port, 'PUT', '/api/board', JSON.stringify({ lanes: ['A'], notes: [], _file: '/inny/plik.json' }));
    assert.strictEqual(put.code, 204);
    assert.strictEqual('_file' in JSON.parse(fs.readFileSync(file, 'utf8')), false);
  } finally { proc.kill(); }
});

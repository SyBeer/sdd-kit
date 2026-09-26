// Katalog produktow wskazany przez uzytkownika. Kryteria z docs/specs/progress-ui.md, zmiana 0.8.0 (AC-26..AC-29).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { KIT_DIR, checkRoot, readRoot, saveRoot, resolveRoot, listDirs } = require('../root');
const { createModule } = require('../modules');

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-root-')));

test('AC-26: checkRoot - odrzuca pusta, wzgledna i folder aplikacji; rozwija ~; zaklada brakujacy', () => {
  ['', '   ', 'produkty', './produkty', '../x'].forEach(p => assert.throws(() => checkRoot(p), /bezwzgl/));
  assert.throws(() => checkRoot(KIT_DIR), /aplikacji/);
  assert.throws(() => checkRoot(path.join(KIT_DIR, 'requirements')), /aplikacji/);
  assert.throws(() => checkRoot(path.join(KIT_DIR, 'plugins', 'sdd', 'x')), /aplikacji/);

  const home = tmp();
  assert.strictEqual(checkRoot('~/produkty', { home }), path.join(home, 'produkty'));
  assert.ok(fs.statSync(path.join(home, 'produkty')).isDirectory());
  assert.strictEqual(checkRoot('~', { home }), home);

  const dir = path.join(tmp(), 'a', 'b');
  assert.strictEqual(checkRoot(dir + '/'), dir);
  assert.ok(fs.existsSync(dir));

  // folder obok aplikacji o wspolnym prefiksie nazwy to NIE jest folder aplikacji
  const kit = path.join(tmp(), 'sdd-kit');
  fs.mkdirSync(kit);
  assert.strictEqual(checkRoot(kit + '-produkty', { kitDir: kit }), kit + '-produkty');

  const file = path.join(tmp(), 'plik.txt');
  fs.writeFileSync(file, 'x');
  assert.throws(() => checkRoot(file), /nie jest folderem/);
});

test('AC-27: saveRoot / readRoot przez plik configu', () => {
  const cfg = path.join(tmp(), 'nowy', 'config.json');
  assert.strictEqual(readRoot(cfg), null);
  saveRoot(cfg, '/x/produkty');
  assert.strictEqual(readRoot(cfg), '/x/produkty');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(cfg, 'utf8')), { modulesRoot: '/x/produkty' });
  fs.writeFileSync(cfg, '{zly');
  assert.strictEqual(readRoot(cfg), null);
  fs.writeFileSync(cfg, '{"modulesRoot": 5}');
  assert.strictEqual(readRoot(cfg), null);
});

test('AC-28: resolveRoot - env > config > rodzic istniejacego projektu; aplikacja odrzucona', () => {
  const a = tmp(), b = tmp(), c = tmp();
  const cfg = path.join(tmp(), 'config.json');
  const project = path.join(c, 'horizon', 'requirements');
  fs.mkdirSync(project, { recursive: true });

  assert.deepStrictEqual(resolveRoot({ env: {}, configFile: cfg, project: path.join(a, 'requirements') }),
    { root: null, source: null, rejected: null });
  assert.strictEqual(resolveRoot({ env: {}, configFile: cfg, project }).root, c);
  assert.strictEqual(resolveRoot({ env: {}, configFile: cfg, project }).source, 'project');

  saveRoot(cfg, b);
  assert.deepStrictEqual(resolveRoot({ env: {}, configFile: cfg, project }), { root: b, source: 'config', rejected: null });
  assert.deepStrictEqual(resolveRoot({ env: { SDD_MODULES_ROOT: a }, configFile: cfg, project }), { root: a, source: 'env', rejected: null });

  saveRoot(cfg, KIT_DIR);
  const r = resolveRoot({ env: {}, configFile: cfg, project: path.join(KIT_DIR, 'requirements') });
  assert.strictEqual(r.root, null);
  assert.strictEqual(r.rejected, KIT_DIR);
  // projekt w aplikacji tez nie wyznacza katalogu
  const fake = path.join(KIT_DIR, 'requirements');
  const r2 = resolveRoot({ env: {}, configFile: path.join(a, 'brak.json'), project: fake, exists: () => true });
  assert.strictEqual(r2.root, null);
  assert.strictEqual(r2.rejected, KIT_DIR);
});

test('AC-31: listDirs - tylko foldery, bez ukrytych, parent, ~, znaczniki aplikacji i modulu', () => {
  const home = tmp();
  ['b', 'a', '.ukryty', 'sdd-kit/plugins'].forEach(d => fs.mkdirSync(path.join(home, d), { recursive: true }));
  fs.writeFileSync(path.join(home, 'plik.txt'), 'x');
  createModule(path.join(home, 'a'), { name: 'horizon', level: 'full' }, { git: false });
  const kitDir = path.join(home, 'sdd-kit');

  const l = listDirs('', { home, kitDir });
  assert.strictEqual(l.path, home);
  assert.strictEqual(l.parent, path.dirname(home));
  assert.strictEqual(l.inKit, false);
  assert.deepStrictEqual(l.dirs.map(d => d.name), ['a', 'b', 'sdd-kit']);
  assert.strictEqual(l.dirs.find(d => d.name === 'sdd-kit').kit, true);
  assert.strictEqual(l.dirs.find(d => d.name === 'b').kit, false);
  assert.strictEqual(l.dirs.find(d => d.name === 'b').path, path.join(home, 'b'));

  const a = listDirs('~/a', { home, kitDir });
  assert.strictEqual(a.path, path.join(home, 'a'));
  assert.deepStrictEqual(a.dirs.map(d => [d.name, d.module]), [['horizon', true]]);

  assert.strictEqual(listDirs(kitDir, { home, kitDir }).inKit, true);
  assert.strictEqual(listDirs('/', { home, kitDir }).parent, null);
  assert.throws(() => listDirs(path.join(home, 'brak'), { home, kitDir }), /Nie ma folderu/);
  assert.throws(() => listDirs(path.join(home, 'plik.txt'), { home, kitDir }), /Nie ma folderu/);
});

function call(port, method, p, body) {
  return new Promise((ok, err) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { 'X-SDD': '1', 'Content-Type': 'application/json' } }, res => {
      let b = ''; res.on('data', d => { b += d; }); res.on('end', () => ok({ status: res.statusCode, body: b }));
    });
    r.on('error', err); r.end(body);
  });
}

test('AC-29: serwer bez katalogu pyta o niego i niczego nie zaklada; POST /api/root zapisuje wybor', async () => {
  const cwd = tmp(), cfg = path.join(tmp(), 'config.json'), target = path.join(tmp(), 'produkty');
  const env = Object.assign({}, process.env, { SDD_CONFIG: cfg });
  delete env.SDD_MODULES_ROOT; delete env.SDD_REQ;
  const port = 4300 + Math.floor(Math.random() * 500);
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js'), 'requirements/01-interview/board.json', String(port)],
    { cwd, env, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, err) => { srv.stdout.once('data', ok); srv.once('exit', c => err(new Error('serwer zakonczyl sie: ' + c))); });
    let p = JSON.parse((await call(port, 'GET', '/api/progress')).body);
    assert.strictEqual(p.needsRoot, true);
    assert.strictEqual(p.modulesRoot, null);
    assert.deepStrictEqual(p.modules, []);
    assert.strictEqual((await call(port, 'POST', '/api/modules', JSON.stringify({ name: 'x', level: 'full' }))).status, 409);
    assert.deepStrictEqual(fs.readdirSync(cwd), []);
    assert.deepStrictEqual(fs.readdirSync(path.dirname(cwd)).filter(n => n === 'x'), []);

    assert.strictEqual((await call(port, 'POST', '/api/root', JSON.stringify({ path: KIT_DIR }))).status, 400);
    assert.strictEqual(fs.existsSync(cfg), false);

    createModule(target, { name: 'horizon', level: 'full' }, { git: false });
    const ok = await call(port, 'POST', '/api/root', JSON.stringify({ path: target }));
    assert.strictEqual(ok.status, 200, ok.body);
    assert.strictEqual(readRoot(cfg), target);
    p = JSON.parse((await call(port, 'GET', '/api/progress')).body);
    assert.strictEqual(p.needsRoot, false);
    assert.strictEqual(p.modulesRoot, target);
    assert.strictEqual(p.module.name, 'horizon');
    assert.strictEqual(p.exists, true);

    // AC-32: przegladanie folderow tylko z panelu
    const bare = await new Promise((ok, err) => http.get({ host: '127.0.0.1', port, path: '/api/dirs' }, r => { r.resume(); ok(r.statusCode); }).on('error', err));
    assert.strictEqual(bare, 403);
    const d = await call(port, 'GET', '/api/dirs?path=' + encodeURIComponent(target));
    assert.strictEqual(d.status, 200);
    assert.deepStrictEqual(JSON.parse(d.body).dirs.map(x => x.name), ['horizon']);
  } finally {
    srv.kill();
  }
});

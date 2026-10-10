// Kopia w repozytorium - serwer end-to-end (0.41.0, docs/specs/repo-copy.md AC-RC10): modul w repo git z lokalnym "origin".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-rcs-'));
const GCFG = path.join(TMP, 'gitconfig');
fs.writeFileSync(GCFG, '');
const ENV = Object.assign({}, process.env, { GIT_CONFIG_GLOBAL: GCFG, GIT_CONFIG_NOSYSTEM: '1', SDD_COPY_HOST: 'testhost' });
delete ENV.SDD_COPY;
const g = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function freePort() {
  return new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function call(port, method, url, body) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: { 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' } }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d, json: () => JSON.parse(d) }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}
function firstEvent(port, url) {
  return new Promise((res, rej) => {
    const r = http.get({ host: '127.0.0.1', port, path: url, headers: { Host: 'localhost:' + port } }, resp => {
      let d = '';
      resp.on('data', c => { d += c; const m = d.match(/^data: (.*)\n\n/); if (m) { r.destroy(); res(JSON.parse(m[1])); } });
    });
    r.on('error', e => { if (e.code !== 'ECONNRESET') rej(e); });
  });
}
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('nie doczekano'); await new Promise(r => setTimeout(r, 100)); }
}

test('AC-RC10: GET /api/copy, kopia teraz, wersja, zapis copy, demo 403, _copy w SSE i nie w board.json', async () => {
  const mod = path.join(TMP, 'modul');
  fs.cpSync(TEMPLATES, path.join(mod, 'requirements'), { recursive: true });
  g(TMP, 'init', '-q', '-b', 'main', mod);
  g(mod, 'config', 'user.email', 'ala@firma.pl'); g(mod, 'config', 'user.name', 'Ala');
  g(mod, 'add', '-A'); g(mod, 'commit', '-qm', 'start');
  const origin = path.join(TMP, 'origin.git');
  g(TMP, 'init', '-q', '--bare', origin);
  g(mod, 'remote', 'add', 'origin', origin);
  fs.writeFileSync(path.join(TMP, 'config.json'), '{}');
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(mod, 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: mod, env: Object.assign({}, ENV, { SDD_CONFIG: path.join(TMP, 'config.json'), SDD_MODULES_ROOT: '', SDD_COPY_DELAY_MS: '200', SDD_UPDATE_CHECK: '0' }) });
  try {
    await new Promise((res, rej) => {
      let out = '';
      proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
      proc.on('exit', code => rej(new Error('serwer: ' + code + ' ' + out)));
    });
    const branch = 'sdd-kopia/ala/testhost/modul';
    // start serwera -> kopia od razu (tryb local, bez wysylki)
    const v0 = await waitFor(async () => { const v = (await call(port, 'GET', '/api/copy')).json(); return v.status && v.status.at ? v : null; });
    assert.strictEqual(v0.mode, 'local');
    assert.strictEqual(v0.repo.copyBranch, branch);
    assert.strictEqual(v0.status.state, 'local');
    assert.deepStrictEqual(v0.versions, []);
    assert.deepStrictEqual(v0.skipped, []);
    assert.ok(g(mod, 'rev-parse', 'refs/heads/' + branch));
    assert.strictEqual(g(mod, 'symbolic-ref', '--short', 'HEAD'), 'main');
    // wlaczenie wysylki -> SDD.yaml copy: remote i kopia na serwerze
    const c = await call(port, 'PUT', '/api/config', { copy: 'remote' });
    assert.strictEqual(c.code, 200);
    assert.strictEqual(c.json().sdd.copy, 'remote');
    assert.match(fs.readFileSync(path.join(mod, 'requirements', 'SDD.yaml'), 'utf8'), /^copy: remote/m);
    await waitFor(async () => (await call(port, 'GET', '/api/copy')).json().status.state === 'ok');
    assert.strictEqual(g(origin, 'rev-parse', 'refs/heads/' + branch), g(mod, 'rev-parse', 'refs/heads/' + branch));
    // zmiana pliku -> kopia po ciszy
    const before = g(mod, 'rev-parse', 'refs/heads/' + branch);
    fs.appendFileSync(path.join(mod, 'requirements', '01-interview', 'QUESTIONS.md'), '\nnowa linia\n');
    await waitFor(async () => g(origin, 'rev-parse', 'refs/heads/' + branch) !== before);
    // kopia teraz
    const now = await call(port, 'POST', '/api/copy/now');
    assert.strictEqual(now.code, 200);
    assert.strictEqual(now.json().status.state, 'ok');
    // wersja
    const v = await call(port, 'POST', '/api/copy/version', { name: 'Pokazane biznesowi' });
    assert.strictEqual(v.code, 200, v.body);
    assert.strictEqual(v.json().versions[0].name, 'Pokazane biznesowi');
    assert.strictEqual(v.json().versions[0].sent, true);
    assert.strictEqual((await call(port, 'POST', '/api/copy/version', { name: 'Pokazane biznesowi' })).code, 409);
    assert.strictEqual((await call(port, 'POST', '/api/copy/version', { name: '' })).code, 409);
    // SSE: stan kopii na Panelu i Tablicy; demo bez kopii
    const p = await firstEvent(port, '/progress-events');
    assert.strictEqual(p.copy.state, 'ok');
    const b = await firstEvent(port, '/events');
    assert.strictEqual(b._copy.state, 'ok');
    assert.strictEqual((await firstEvent(port, '/demo/progress-events')).copy, null);
    assert.strictEqual((await call(port, 'POST', '/demo/api/copy/now')).code, 403);
    assert.strictEqual((await call(port, 'GET', '/demo/api/copy')).code, 409);
    // zapis tablicy nie przenosi _copy do pliku
    const put = await call(port, 'PUT', '/api/board', Object.assign({}, b, { notes: [] }));
    assert.strictEqual(put.code, 204);
    assert.ok(!('_copy' in JSON.parse(fs.readFileSync(path.join(mod, 'requirements', '01-interview', 'board.json'), 'utf8'))));
  } finally { proc.kill(); }
});

test.after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

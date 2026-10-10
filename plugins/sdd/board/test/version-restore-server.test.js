// "Pokaż zmiany" i "Przywróć" - serwer end-to-end (0.42.0, docs/specs/version-restore.md AC-VR4).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-vrs-'));
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

test('AC-VR4: GET /api/copy/diff, POST /api/copy/restore, zla nazwa 409, demo 403', async () => {
  const mod = path.join(TMP, 'modul');
  fs.cpSync(TEMPLATES, path.join(mod, 'requirements'), { recursive: true });
  g(TMP, 'init', '-q', '-b', 'main', mod);
  g(mod, 'config', 'user.email', 'ala@firma.pl'); g(mod, 'config', 'user.name', 'Ala');
  g(mod, 'add', '-A'); g(mod, 'commit', '-qm', 'start');
  fs.writeFileSync(path.join(TMP, 'config.json'), '{}');
  const Q = path.join(mod, 'requirements', '01-interview', 'QUESTIONS.md');
  const orig = fs.readFileSync(Q, 'utf8');
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(mod, 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: mod, env: Object.assign({}, ENV, { SDD_CONFIG: path.join(TMP, 'config.json'), SDD_MODULES_ROOT: '', SDD_COPY_DELAY_MS: '200', SDD_UPDATE_CHECK: '0' }) });
  try {
    await new Promise((res, rej) => {
      let out = '';
      proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
      proc.on('exit', code => rej(new Error('serwer: ' + code + ' ' + out)));
    });
    const v = await call(port, 'POST', '/api/copy/version', { name: 'Pokazane' });
    assert.strictEqual(v.code, 200, v.body);
    const tag = v.json().versions[0].tag;
    fs.appendFileSync(Q, '\nzmiana po wersji\n');
    const d = await call(port, 'GET', '/api/copy/diff?tag=' + encodeURIComponent(tag));
    assert.strictEqual(d.code, 200, d.body);
    assert.deepStrictEqual(d.json().files.map(f => [f.file, f.status]), [['01-interview/QUESTIONS.md', 'changed']]);
    assert.strictEqual((await call(port, 'GET', '/api/copy/diff?tag=v1')).code, 409);
    const r = await call(port, 'POST', '/api/copy/restore', { tag });
    assert.strictEqual(r.code, 200, r.body);
    assert.strictEqual(fs.readFileSync(Q, 'utf8'), orig);
    assert.match(r.json().restore.before.name, /^przed przywróceniem Pokazane \d\d:\d\d$/);
    assert.ok(r.json().versions.some(x => x.tag === r.json().restore.before.tag));
    assert.strictEqual((await call(port, 'POST', '/api/copy/restore', { tag: 'v1' })).code, 409);
    assert.strictEqual((await call(port, 'POST', '/demo/api/copy/restore', { tag })).code, 403);
  } finally { proc.kill(); }
});

test.after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

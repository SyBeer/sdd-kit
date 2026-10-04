// Klucze API w ~/.sdd-kit/.env. Kryteria z docs/specs/secrets.md (AC-S1..AC-S5, zmiana 0.28.5).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const sec = require('../secrets');

const KIT = path.join(__dirname, '..', '..', '..', '..');
const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p));

test('AC-S1: readEnv / setEnv', () => {
  const t = '# klucze sdd-kit\nexport REDMINE_API_KEY="abc 123"\n\nINNY=x # bez komentarzy w wartosci\nPUSTY=\n';
  assert.deepStrictEqual(sec.readEnv(t), { REDMINE_API_KEY: 'abc 123', INNY: 'x # bez komentarzy w wartosci', PUSTY: '' });
  let u = sec.setEnv(t, 'REDMINE_API_KEY', 'nowy');
  assert.strictEqual(sec.readEnv(u).REDMINE_API_KEY, 'nowy');
  assert.match(u, /^# klucze sdd-kit$/m);
  assert.strictEqual(sec.readEnv(u).INNY, 'x # bez komentarzy w wartosci');
  u = sec.setEnv(u, 'REDMINE_API_KEY', '');
  assert.strictEqual(sec.readEnv(u).REDMINE_API_KEY, undefined);
  assert.strictEqual(sec.readEnv(sec.setEnv('', 'REDMINE_API_KEY', 'k')).REDMINE_API_KEY, 'k');
});

test('AC-S2: redmineKey - zmienna > plik > Pek kluczy', () => {
  const f = path.join(tmp('sdd-env-'), '.env');
  const base = { SDD_ENV_FILE: f, SDD_REDMINE_KEYCHAIN: '0' };
  assert.deepStrictEqual(sec.redmineKey(base), { source: 'none', value: '' });
  fs.writeFileSync(f, 'REDMINE_API_KEY=zpliku\n');
  assert.deepStrictEqual(sec.redmineKey(base), { source: 'file', value: 'zpliku' });
  assert.deepStrictEqual(sec.redmineKey(Object.assign({ REDMINE_API_KEY: 'zmienna' }, base)), { source: 'env', value: 'zmienna' });
});

// ---------------------------------------------------------------- serwer (AC-S3)
const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
function freePort() {
  return new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function call(port, method, url, body, extra) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: Object.assign({ 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' }, extra) }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

test('AC-S3: serwer - zapis klucza do .env, nigdy wartosc w odpowiedzi', async () => {
  const port = await freePort();
  const root = tmp('sdd-sec-');
  fs.cpSync(TEMPLATES, path.join(root, 'a', 'requirements'), { recursive: true });
  const envFile = path.join(root, 'kit', '.env');
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '', SDD_UPDATE_CHECK: '0',
      SDD_ENV_FILE: envFile, SDD_REDMINE_KEYCHAIN: '0', REDMINE_API_KEY: '' }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  const KEY = 'tajny-klucz-987';
  try {
    assert.strictEqual(JSON.parse((await call(port, 'GET', '/api/config')).body).redmineKey, 'none');
    assert.strictEqual((await call(port, 'PUT', '/api/secrets', { REDMINE_API_KEY: KEY }, { 'x-sdd': '' })).code, 403);
    assert.strictEqual((await call(port, 'PUT', '/demo/api/secrets', { REDMINE_API_KEY: KEY })).code, 403);
    assert.strictEqual((await call(port, 'PUT', '/api/secrets', { GITHUB_TOKEN: 'x' })).code, 400);
    assert.strictEqual((await call(port, 'PUT', '/api/secrets', { REDMINE_API_KEY: 'a\nINNY=b' })).code, 400);
    const r = await call(port, 'PUT', '/api/secrets', { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 200, r.body);
    assert.ok(!r.body.includes(KEY));
    assert.strictEqual(sec.readEnv(fs.readFileSync(envFile, 'utf8')).REDMINE_API_KEY, KEY);
    if (process.platform !== 'win32') assert.strictEqual(fs.statSync(envFile).mode & 0o777, 0o600);
    const cfg = await call(port, 'GET', '/api/config');
    assert.strictEqual(JSON.parse(cfg.body).redmineKey, 'file');
    assert.ok(!cfg.body.includes(KEY));
    assert.strictEqual((await call(port, 'PUT', '/api/secrets', { REDMINE_API_KEY: '' })).code, 200);
    assert.strictEqual(sec.readEnv(fs.readFileSync(envFile, 'utf8')).REDMINE_API_KEY, undefined);
    assert.strictEqual(JSON.parse((await call(port, 'GET', '/api/config')).body).redmineKey, 'none');
    const log = fs.readFileSync(path.join(root, 'a', 'requirements', 'CHANGELOG.md'), 'utf8');
    assert.ok(!log.includes(KEY));
  } finally { proc.kill(); }
});

test('AC-S5: zasada "nie czytaj .env" w skillu i szablonie, .gitignore kitu', () => {
  const skill = fs.readFileSync(path.join(BOARD_DIR, '..', 'skills', 'handover', 'SKILL.md'), 'utf8');
  const claude = fs.readFileSync(path.join(BOARD_DIR, '..', 'templates', 'CLAUDE.md'), 'utf8');
  [skill, claude].forEach(t => assert.match(t, /~\/\.sdd-kit\/\.env/));
  assert.match(claude, /nie otwieraj/i);
  const gi = fs.readFileSync(path.join(KIT, '.gitignore'), 'utf8').split('\n').map(l => l.trim());
  ['/.env', '/config.json', '/bin/'].forEach(e => assert.ok(gi.includes(e), 'brak w .gitignore: ' + e));
});

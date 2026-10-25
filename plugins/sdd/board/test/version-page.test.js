// Wersja w pasku -> karta Serwer, aktualizacja pluginu przyciskiem, komendy restartu (docs/specs/version-page.md, 0.46.0).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const ui = require('../ui.js');

const B = path.join(__dirname, '..');
const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p));

test('AC-VP1: klik w wersje zawsze prowadzi do karty Serwer (poza demo-startem)', () => {
  const ok = ui.versionBadge({ running: '0.46.0', disk: '0.46.0', plugin: '0.46.0' }, '');
  assert.strictEqual(ok.href, '/config#wersja');
  assert.strictEqual(ok.local, true);
  assert.deepStrictEqual(ok.steps, []);
  assert.match(ok.title, /Kliknij: wersja i serwer$/);
  assert.strictEqual(ui.versionBadge({ running: '0.46.0', disk: '0.46.0' }, '/demo').href, '/demo/config#wersja');
  const st = ui.versionBadge({ running: '0.46.0', disk: '0.46.0' }, '/demo/start');
  assert.strictEqual(st.href, 'https://github.com/SyBeer/sdd-kit/releases/tag/v0.46.0');
  assert.strictEqual(st.local, false);
});

test('AC-VP2: plugin nieaktualny - krok z przyciskiem Aktualizuj, komendy recznie, restart sesji', () => {
  const p = ui.versionBadge({ running: '0.45.0', disk: '0.45.0', plugin: '0.44.2', platform: 'darwin' }, '');
  assert.strictEqual(p.steps[0].action, 'plugin');
  assert.match(p.steps[0].text, /0\.44\.2.*0\.45\.0/);
  assert.deepStrictEqual(p.steps[0].manual, ['command claude plugin marketplace update sdd-kit', 'command claude plugin update sdd@sdd-kit']);
  const cmds = p.steps.filter(s => s.cmd).map(s => s.cmd);
  assert.ok(cmds.includes('/exit'), cmds.join('|'));
  assert.ok(cmds.some(c => /command claude --continue$/.test(c)), cmds.join('|'));
});

test('AC-VP3: serwer nieaktualny - komenda restartu z /api/version', () => {
  const r = 'node "/k/server.js" "/m/board.json" 8012';
  const s = ui.versionBadge({ running: '0.45.0', disk: '0.46.0', restart: r }, '');
  assert.ok(s.steps.some(x => x.cmd === r));
  const n = ui.versionBadge({ running: '0.45.0', disk: '0.46.0' }, '');
  assert.ok(n.steps.some(x => x.cmd === 'sdd-board'));
});

test('AC-VP4: nieaktualna sesja - /exit i claude --continue w jej folderze', () => {
  const ses = [{ cwd: '/x', version: '0.44.0', stale: true }];
  const m = ui.versionBadge({ running: '0.46.0', disk: '0.46.0', plugin: '0.46.0', sessions: ses, platform: 'darwin' }, '');
  const cmds = m.steps.filter(s => s.cmd).map(s => s.cmd);
  assert.ok(cmds.includes('/exit'));
  assert.ok(cmds.includes('cd "/x" && command claude --continue'), cmds.join('|'));
  const w = ui.versionBadge({ running: '0.46.0', disk: '0.46.0', plugin: '0.46.0', sessions: ses, platform: 'win32' }, '');
  assert.ok(w.steps.some(s => s.cmd === 'cd "/x"; claude --continue'));
});

// ---------------------------------------------------------------- serwer
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
    if (method === 'POST') r.write(body || '{}');
    r.end();
  });
}

test('AC-VP5, AC-VP6: serwer - aktualizacja samego pluginu i komenda restartu', async () => {
  const port = await freePort();
  const root = tmp('sdd-vp-');
  fs.cpSync(path.join(B, '..', 'templates', 'requirements'), path.join(root, 'a', 'requirements'), { recursive: true });
  // zrodlo directory z niezapisanymi zmianami - pelna aktualizacja bylaby bledem
  const kit = path.join(root, 'kit');
  fs.mkdirSync(kit);
  execFileSync('git', ['init', '-q'], { cwd: kit });
  fs.writeFileSync(path.join(kit, 'zmiana.txt'), 'x');
  const known = path.join(root, 'known.json');
  fs.writeFileSync(known, JSON.stringify({ 'sdd-kit': { source: { source: 'directory', path: kit } } }));
  const d = tmp('sdd-fc-'), log = path.join(d, 'log'), bin = path.join(d, process.platform === 'win32' ? 'claude.cmd' : 'claude');
  if (process.platform === 'win32') fs.writeFileSync(bin, `@echo off\r\necho %*>>"${log}"\r\n`);
  else fs.writeFileSync(bin, `#!/bin/sh\necho "$*" >> "${log}"\n`, { mode: 0o755 });
  const board = path.join(root, 'a', 'requirements', '01-interview', 'board.json');
  const proc = spawn(process.execPath, [path.join(B, 'server.js'), board, String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '',
      SDD_KNOWN_MARKETPLACES: known, SDD_KIT_DIR: tmp('sdd-kitdir-'), SDD_CLAUDE_BIN: bin, SDD_UPDATE_CHECK: '0' }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  try {
    assert.strictEqual((await call(port, 'POST', '/api/update')).code, 409, 'pelna aktualizacja blokowana przez zmiany');
    const r = await call(port, 'POST', '/api/update', '{"plugin":true}');
    assert.strictEqual(r.code, 200, r.body);
    const j = JSON.parse(r.body);
    assert.strictEqual(j.ok, true);
    assert.deepStrictEqual(j.log.map(x => x.cmd), ['claude plugin marketplace update sdd-kit', 'claude plugin update sdd@sdd-kit']);
    const v = JSON.parse((await call(port, 'GET', '/api/version')).body);
    assert.ok(v.restart.includes('server.js'), v.restart);
    assert.ok(v.restart.includes(board), v.restart);
    assert.ok(v.restart.endsWith(' ' + port), v.restart);
  } finally { proc.kill(); }
});

test('AC-VP7: karta Serwer - Aktualizuj uruchamia aktualizacje w miejscu', () => {
  const info = fs.readFileSync(path.join(B, 'info.html'), 'utf8');
  assert.match(info, /data-vact="'\+esc\(st\.action\)/);
  assert.match(info, /getAttribute\('data-vact'\)==='plugin'/);
  assert.match(info, /JSON\.stringify\(\{plugin:true\}\)/);
  assert.doesNotMatch(info, /SddUI\.openUpdate\(\)/);
  assert.match(info, /Aktualizuję…/);
});

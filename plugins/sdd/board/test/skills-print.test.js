// Odcisk skilli zamiast numeru wersji (docs/specs/session-version.md, zmiana 0.46.1, AC-SV13..AC-SV17).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const sm = require('../session-mark');
const ui = require('../ui.js');

const B = path.join(__dirname, '..');
const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p || 'sdd-sp-'));
function plugin(skill, extra) {
  const r = tmp();
  fs.mkdirSync(path.join(r, 'skills', 'spec'), { recursive: true });
  fs.mkdirSync(path.join(r, 'hooks'));
  fs.mkdirSync(path.join(r, 'board'));
  fs.writeFileSync(path.join(r, 'skills', 'spec', 'SKILL.md'), skill);
  fs.writeFileSync(path.join(r, 'hooks', 'hooks.json'), '{"hooks":{}}\n');
  fs.writeFileSync(path.join(r, 'board', 'ui.js'), extra || 'a');
  return r;
}

test('AC-SV13: skillsPrint - tylko skills/ i hooks/, CRLF bez znaczenia', () => {
  const a = plugin('# spec\nlinia\n', 'panel 1'), b = plugin('# spec\nlinia\n', 'panel 2');
  assert.match(sm.skillsPrint(a), /^[0-9a-f]{12}$/);
  assert.strictEqual(sm.skillsPrint(a), sm.skillsPrint(b), 'zmiana w board/ nie zmienia odcisku');
  assert.notStrictEqual(sm.skillsPrint(a), sm.skillsPrint(plugin('# spec\ninna\n')), 'zmiana SKILL.md');
  const h = plugin('# spec\nlinia\n'); fs.writeFileSync(path.join(h, 'hooks', 'hooks.json'), '{"hooks":{"X":[]}}\n');
  assert.notStrictEqual(sm.skillsPrint(a), sm.skillsPrint(h), 'zmiana hooks.json');
  assert.strictEqual(sm.skillsPrint(plugin('# spec\r\nlinia\r\n')), sm.skillsPrint(a), 'CRLF');
  assert.strictEqual(sm.skillsPrint(tmp()), '');
});

test('AC-SV14: start zapisuje odcisk skilli swojej kopii pluginu', () => {
  const dir = path.join(tmp(), 'sessions');
  const r = spawnSync(process.execPath, [path.join(B, 'session-mark.js'), 'start'], {
    input: JSON.stringify({ session_id: 'sp-1', cwd: '/x' }), env: Object.assign({}, process.env, { SDD_SESSIONS_DIR: dir }), encoding: 'utf8' });
  assert.strictEqual(r.status, 0); assert.strictEqual(r.stdout, '');
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'sp-1.json'), 'utf8'));
  assert.strictEqual(m.skills, sm.skillsPrint(path.join(B, '..')));
  assert.ok(m.skills);
});

test('AC-SV15: listSessions - stale wg odcisku, stare znaczniki wg wersji', () => {
  const dir = tmp();
  const put = (id, m) => fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(Object.assign({ cwd: '/x', started: new Date().toISOString() }, m)));
  put('same', { version: '0.46.0', skills: 'aaaaaaaaaaaa' });   // inna wersja, te same skille
  put('diff', { version: '0.46.1', skills: 'bbbbbbbbbbbb' });   // ta sama wersja, inne skille
  put('old', { version: '0.45.0' });                             // bez odcisku - regula wersji
  const st = {};
  sm.listSessions({ dir, plugin: '0.46.1', skills: 'aaaaaaaaaaaa' }).forEach(s => { st[s.version] = s.stale; });
  assert.deepStrictEqual(st, { '0.46.0': false, '0.46.1': true, '0.45.0': true });
});

test('AC-SV17: versionBadge - plugin nieaktualny bez zmian w skillach nie kaze restartowac sesji', () => {
  const base = { running: '0.46.1', disk: '0.46.1', plugin: '0.46.0', platform: 'darwin', sessions: [{ cwd: '/x', version: '0.46.0', stale: false }] };
  const no = ui.versionBadge(Object.assign({ skillsChanged: false }, base), '');
  assert.strictEqual(no.steps.length, 1);
  assert.strictEqual(no.steps[0].action, 'plugin');
  assert.match(no.steps[0].text, /skille bez zmian - sesji Claude nie trzeba restartować/i);
  const yes = ui.versionBadge(Object.assign({ skillsChanged: true }, base), '');
  assert.ok(yes.steps.some(s => s.cmd === '/exit'));
  assert.ok(yes.steps.some(s => s.cmd === 'cd "/x" && command claude --continue'), 'po aktualizacji skilli - kazda otwarta sesja');
  assert.ok(ui.versionBadge(base, '').steps.some(s => s.cmd === '/exit'), 'brak pola - jak 0.46.0');
});

// ---------------------------------------------------------------- serwer (AC-SV16)
function freePort() {
  return new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function get(port, url) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port, path: url, headers: { Host: 'localhost:' + port } }, r => {
      let d = ''; r.on('data', c => { d += c; }); r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}
async function serve(root, pluginsFile) {
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(B, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '',
      SDD_PLUGINS_FILE: pluginsFile, SDD_SESSIONS_DIR: tmp(), SDD_UPDATE_CHECK: '0' }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  return { port, proc };
}

test('AC-SV16: /api/version - odcisk zainstalowanego pluginu i skillsChanged', async () => {
  const root = tmp();
  fs.cpSync(path.join(B, '..', 'templates', 'requirements'), path.join(root, 'a', 'requirements'), { recursive: true });
  const pf = path.join(root, 'installed.json');
  const inst = p => fs.writeFileSync(pf, JSON.stringify({ version: 2, plugins: { 'sdd@sdd-kit': [{ scope: 'user', version: '0.1.0', installPath: p }] } }));
  inst(path.join(B, '..'));  // zainstalowany = kit na dysku
  const { port, proc } = await serve(root, pf);
  try {
    let v = await get(port, '/api/version');
    assert.strictEqual(v.skills, sm.skillsPrint(path.join(B, '..')));
    assert.strictEqual(v.skillsChanged, false);
    inst(plugin('# inny skill\n'));   // czytane przy kazdym zapytaniu
    v = await get(port, '/api/version');
    assert.strictEqual(v.skillsChanged, true);
  } finally { proc.kill(); }
});

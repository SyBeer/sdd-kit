// Przelacznik interfejsu: motyw i zakladki. Kryteria z docs/specs/ui-switch.md (AC-U1..AC-U3).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const ui = require('../ui');

test('AC-U1: pickTheme - zapisany wybor albo motyw systemu', () => {
  assert.strictEqual(ui.pickTheme('light', true), 'light');
  assert.strictEqual(ui.pickTheme('dark', false), 'dark');
  [null, undefined, '', 'auto', 'blue', 'DARK'].forEach(v => {
    assert.strictEqual(ui.pickTheme(v, true), 'dark');
    assert.strictEqual(ui.pickTheme(v, false), 'light');
  });
});

test('AC-U2: tabs - Panel i Tablica, biezaca zaznaczona', () => {
  const t = ui.tabs('board');
  assert.deepStrictEqual(t.map(x => x.href), ['/', '/board']);
  assert.deepStrictEqual(t.map(x => x.current), [false, true]);
  assert.deepStrictEqual(ui.tabs('panel').map(x => x.current), [true, false]);
  assert.deepStrictEqual(ui.tabs('cos').map(x => x.current), [false, false]);
  t.forEach(x => { assert.ok(x.label); assert.ok(x.short); });
});

function get(port, p) {
  return new Promise((ok, err) => http.get({ host: '127.0.0.1', port, path: p }, r => {
    let body = ''; r.on('data', d => { body += d; }); r.on('end', () => ok({ status: r.statusCode, type: r.headers['content-type'], body }));
  }).on('error', err));
}

test('AC-U3: serwer zwraca /ui.js i /ui.css', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ui-'));
  const board = path.join(dir, 'requirements', '01-interview', 'board.json');
  fs.mkdirSync(path.dirname(board), { recursive: true });
  fs.writeFileSync(board, '{"title":"t","lanes":[],"notes":[]}');
  const port = 4300 + Math.floor(Math.random() * 500);
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js'), board, String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, err) => { srv.stdout.once('data', ok); srv.once('exit', c => err(new Error('serwer zakonczyl sie: ' + c))); });
    const js = await get(port, '/ui.js');
    assert.strictEqual(js.status, 200);
    assert.match(js.type, /javascript/);
    assert.match(js.body, /pickTheme/);
    const css = await get(port, '/ui.css');
    assert.strictEqual(css.status, 200);
    assert.match(css.type, /text\/css/);
  } finally {
    srv.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

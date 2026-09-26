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

test('AC-U6: modMenu - biezacy zaznaczony, escapowanie, Nowy modul', () => {
  const h = ui.modMenu([{ name: 'horizon', level: 'full' }, { name: 'horizon-zlecenia', level: 'light' }], 'horizon-zlecenia');
  assert.strictEqual((h.match(/data-mod=/g) || []).length, 2);
  assert.strictEqual((h.match(/aria-checked="true"/g) || []).length, 1);
  assert.match(h, /aria-checked="true" data-mod="horizon-zlecenia"/);
  assert.match(h, /pełny/);
  assert.match(h, /lekki/);
  assert.match(h, /Nowy moduł/);
  assert.match(h, /id="chroot"[^>]*>.*Zmień katalog modułów…/); // AC-30: zmiana katalogu z menu
  const x = ui.modMenu([{ name: 'a' }], 'b<i>');
  assert.ok(x.indexOf('data-mod="b&lt;i&gt;"') >= 0 && x.indexOf('data-mod="b&lt;i&gt;"') < x.indexOf('data-mod="a"'));
  assert.ok(x.indexOf('<i>') < 0);
});

function get(port, p) {
  return new Promise((ok, err) => http.get({ host: '127.0.0.1', port, path: p }, r => {
    let body = ''; r.on('data', d => { body += d; }); r.on('end', () => ok({ status: r.statusCode, type: r.headers['content-type'], body }));
  }).on('error', err));
}

function req(port, method, p, body) {
  return new Promise((ok, err) => {
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { 'X-SDD': '1', 'Content-Type': 'application/json' } }, res => {
      let b = ''; res.on('data', d => { b += d; }); res.on('end', () => ok({ status: res.statusCode, body: b }));
    });
    r.on('error', err); r.end(body);
  });
}

test('AC-U3, AC-U7: serwer - /ui.js, /ui.css, modul w widoku tablicy', async () => {
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
    const view = JSON.parse((await get(port, '/api/board')).body);
    assert.strictEqual(view._module.name, path.basename(dir));
    assert.ok(Array.isArray(view._modules));
    view.notes = [{ id: 'n1', type: 'ev', text: 'x', lane: 'A', col: 0 }];
    assert.strictEqual((await req(port, 'PUT', '/api/board', JSON.stringify(view))).status, 204);
    const saved = JSON.parse(fs.readFileSync(board, 'utf8'));
    assert.deepStrictEqual(['_module', '_modules', '_sync'].filter(k => k in saved), []);
    assert.strictEqual(saved.notes.length, 1);
  } finally {
    srv.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

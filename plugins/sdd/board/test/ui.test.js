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

test('AC-U2: tabs - Panel i Tablica na poczatku, biezaca zaznaczona (pelna lista: AC-C1)', () => {
  const t = ui.tabs('board');
  assert.deepStrictEqual(t.slice(0, 2).map(x => x.href), ['/', '/board']);
  assert.deepStrictEqual(t.map(x => x.current).filter(Boolean).length, 1);
  assert.strictEqual(t[1].current, true);
  assert.strictEqual(ui.tabs('panel')[0].current, true);
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

test('AC-31: cardOpen - wybor usera, bez niego tylko aktualny etap', () => {
  assert.strictEqual(ui.cardOpen('domain', 'domain', {}), true);
  assert.strictEqual(ui.cardOpen('intake', 'domain', {}), false);
  assert.strictEqual(ui.cardOpen('intake', 'domain', { intake: true }), true);
  assert.strictEqual(ui.cardOpen('domain', 'domain', { domain: false }), false);
  assert.strictEqual(ui.cardOpen('spec', 'domain', null), false);
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
  // wlasny config - serwer zapisuje ostatni modul (0.13.0), nie ruszamy ~/.sdd-kit/config.json usera
  const env = Object.assign({}, process.env, { SDD_CONFIG: path.join(dir, 'config.json') });
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js'), board, String(port)], { env, stdio: ['ignore', 'pipe', 'inherit'] });
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

test('AC-40: modMenu w demo - bez "Nowy moduł…" i "Zmień katalog modułów…"', () => {
  const d = ui.modMenu([{ name: 'zlecenia', level: 'full' }], 'zlecenia', true);
  assert.ok(d.includes('zlecenia'));
  assert.ok(!d.includes('newmod') && !d.includes('chroot'));
  const n = ui.modMenu([{ name: 'zlecenia', level: 'full' }], 'zlecenia');
  assert.ok(n.includes('newmod') && n.includes('chroot'));
});

test('AC-44: base() i tabs() z przedrostkiem kontekstu', () => {
  assert.strictEqual(ui.base('/'), '');
  assert.strictEqual(ui.base('/board'), '');
  assert.strictEqual(ui.base('/demo'), '/demo');
  assert.strictEqual(ui.base('/demo/board'), '/demo');
  assert.strictEqual(ui.base('/demo/start'), '/demo/start');
  assert.strictEqual(ui.base('/demonstracja'), '');
  // pelna lista zakladek od 0.16.0: AC-C1 (info-config.test.js)
  assert.deepStrictEqual(ui.tabs('panel', '/demo').slice(0, 2).map(x => x.href), ['/demo', '/demo/board']);
  assert.deepStrictEqual(ui.tabs('board').slice(0, 2).map(x => x.href), ['/', '/board']);
  const st = ui.tabs('board', '/demo/start');
  assert.strictEqual(st[0].href, '/demo/start');
  assert.strictEqual(st[0].current, true);
});

test('AC-52: modMenu - modul po sciezce, dopisek "poza katalogiem", Dodaj istniejacy projekt', () => {
  const mods = [{ name: 'horizon', level: 'full', dir: '/r/horizon' }, { name: 'fv-manager', level: 'full', dir: '/x/fv-manager', external: true }];
  const h = ui.modMenu(mods, '/x/fv-manager');
  assert.ok(h.includes('data-dir="/x/fv-manager"') && h.includes('data-dir="/r/horizon"'));
  assert.match(h, /data-dir="\/x\/fv-manager"[^>]*aria-checked="true"|aria-checked="true"[^>]*data-dir="\/x\/fv-manager"/);
  assert.ok(h.includes('poza katalogiem'));
  assert.ok(h.includes('id="addproj"'));
  assert.ok(!ui.modMenu(mods, '/r/horizon', true).includes('addproj'));
});

test('AC-57: countList - naglowek z plikiem, pozycje, escapowanie, warn, pusta lista', () => {
  const h = ui.countList('decyzji', { file: '01-interview/DECISIONS.md', items: [
    { id: 'D-001', title: 'Termin <b>', status: 'sponsor · 2026-09-20', note: '14 dni' },
    { id: 'D-002', title: 'Przycisk', status: 'wlasciciel', note: 'x', warn: 'brak powodu' },
  ] });
  assert.match(h, /decyzji/); assert.match(h, /2/); assert.match(h, /01-interview\/DECISIONS\.md/);
  assert.match(h, /D-001/); assert.match(h, /Termin &lt;b&gt;/); assert.ok(!/Termin <b>/.test(h));
  assert.match(h, /14 dni/); assert.match(h, /class="[^"]*warn[^"]*"[^>]*>brak powodu/);
  assert.match(ui.countList('obalonych', { file: 'x.md', items: [] }), /Brak pozycji/);
});

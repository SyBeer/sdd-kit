// Odchudzony interfejs tablicy (zmiana 0.33.0). Kryteria: docs/specs/board-ui.md AC-B54..AC-B57.
// Uruchom: node --test plugins/sdd/board/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const ui = require('../ui');

const B = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(B, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(B, 'ui.css'), 'utf8');

function get(port, p) {
  return new Promise((ok, err) => http.get({ host: '127.0.0.1', port, path: p }, r => {
    const c = []; r.on('data', d => c.push(d)); r.on('end', () => ok({ code: r.statusCode, type: r.headers['content-type'], body: Buffer.concat(c) }));
  }).on('error', err));
}

test('AC-B54: czcionki lokalnie, @font-face w ui.css, serwer podaje tylko pliki z fonts/', async () => {
  const F = path.join(B, 'fonts');
  const want = ['sans-latin-400', 'sans-latin-ext-400', 'sans-latin-700', 'sans-latin-ext-700', 'mono-latin-400', 'mono-latin-ext-600']
    .map(x => 'ibm-plex-' + x + '-normal.woff2');
  want.forEach(f => assert.ok(fs.existsSync(path.join(F, f)), f));
  assert.match(fs.readFileSync(path.join(F, 'OFL.txt'), 'utf8'), /Open Font License/);
  assert.match(css, /@font-face\{font-family:"IBM Plex Sans";[^}]*src:url\(\/fonts\/ibm-plex-sans-latin-ext-400-normal\.woff2\)/);
  assert.match(css, /@font-face\{font-family:"IBM Plex Mono"/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-look-'));
  const board = path.join(dir, 'requirements', '01-interview', 'board.json');
  fs.mkdirSync(path.dirname(board), { recursive: true });
  fs.writeFileSync(board, '{"title":"t","lanes":[],"notes":[]}');
  const port = 5300 + Math.floor(Math.random() * 400);
  const env = Object.assign({}, process.env, { SDD_CONFIG: path.join(dir, 'config.json') });
  const srv = spawn(process.execPath, [path.join(B, 'server.js'), board, String(port)], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, err) => { srv.stdout.once('data', ok); srv.once('exit', c => err(new Error('serwer: ' + c))); });
    const r = await get(port, '/fonts/' + want[0]);
    assert.strictEqual(r.code, 200);
    assert.strictEqual(r.type, 'font/woff2');
    assert.strictEqual(r.body.slice(0, 4).toString(), 'wOF2');
    for (const p of ['/fonts/../server.js', '/fonts/OFL.txt', '/fonts/brak.woff2', '/fonts/%2e%2e%2fserver.js'])
      assert.notStrictEqual((await get(port, p)).type, 'font/woff2', p);
    assert.strictEqual((await get(port, '/fonts/brak.woff2')).code, 404);
  } finally { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('AC-B55: pasek tablicy - logo, sciezka modulu, krotkie zakladki, jeden przycisk motywu (od 0.34.0 wspolny, AC-F1)', () => {
  const b = ui.topbarHtml('board', '', 'light');
  assert.match(b, /class="logo"/);
  assert.match(b, /class="crumb"/);
  assert.match(b, /<span class="tab" aria-current="page">Tablica<\/span>/);
  ['Panel', 'Moduł', 'Jak to działa'].forEach(t => assert.match(b, new RegExp('>' + t + '</a>'), t));
  assert.match(b, /<a class="ic cfg" href="\/config" title="Konfiguracja"/);
  assert.match(b, /class="ic theme-btn"[^>]*title="Ciemny motyw"[^>]*>☾</);
  assert.match(ui.topbarHtml('board', '', 'dark'), /title="Jasny motyw"[^>]*>☀</);
  assert.doesNotMatch(b, /name="sdd-theme"/);
  assert.doesNotMatch(b, /class="xlink"/);
  assert.match(b, /class="slot-q"/);
  assert.match(css, /\.topbar\{[^}]*height:36px/);
});

test('AC-B56: tablica - id dla skryptu, pasek stanu, linijka kolumn, karteczka 128 px bez obrotu, tokeny', () => {
  ['addnote', 'addlane', 'undo', 'redo', 'zin', 'zout', 'zfit', 'zval', 'syncbar', 'qbar', 'conn', 'drawer', 'f-text', 'f-type',
    'f-lane', 'f-ref', 'ansbox', 'save', 'cancel', 'dup', 'del', 'up', 'down', 'src', 'fold', 'rail', 'close', 'modbtn', 'modmenu',
    'order', 'ok', 'msg', 'switched', 'board', 'inner'].forEach(id => assert.match(html, new RegExp('id="' + id + '"'), id));
  assert.match(html, /class="statusbar"/);
  ['w plikach', 'zmienione po synchronizacji', 'tylko na tablicy', 'brak w pliku'].forEach(t => assert.ok(html.includes(t), t));
  assert.match(html, /board:\['●','tylko na tablicy'\]/);
  assert.match(html, /r.className='ruler'/);
  assert.match(html, /\.note\{width:128px/);
  assert.doesNotMatch(html, /rotate\(-1deg\)|nth-child\(odd\)\{transform/);
  assert.match(html, /#drawer\{[^}]*width:300px/);
  // tokeny wspolne dla stron w ui.css od 0.34.0 (AC-F1)
  assert.match(css, /--hot-ink:#c2412f/);
  assert.match(css, /--hot:#ff9d8d/);
  assert.match(html, /ODPOWIEDŹ CZEKA/);
  assert.match(css, /--sans:"IBM Plex Sans"/);
  assert.match(html, /font-family:var\(--sans\)/);
});

test('AC-B57: klawisze 1-7 ustawiaja typ, poza polem tekstowym, bez Cmd/Ctrl, nie w demo', () => {
  const m = html.match(/\/\/ Klawisze 1-7[\s\S]{0,700}/);
  assert.ok(m, 'brak obslugi klawiszy 1-7');
  assert.match(m[0], /typing\(e\.target\)/);
  assert.match(m[0], /metaKey\|\|e\.ctrlKey/);
  assert.match(m[0], /board\._demo/);
  assert.match(m[0], /TYPES\[/);
});

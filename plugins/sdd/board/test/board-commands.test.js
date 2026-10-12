// Polecenia dla Claude na pasku Tablicy + /sdd:board tidy (0.43.0, docs/specs/board-commands.md AC-BC1..AC-BC4).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../ui.js');
const B = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(B, f), 'utf8');

test('AC-BC1: boardCmds - cztery polecenia w kolejnosci, z podpowiedzia', () => {
  const c = ui.boardCmds();
  assert.deepStrictEqual(c.map(x => [x.id, x.label, x.cmd]), [
    ['sync', 'Przenieś karteczki do plików [sync]', '/sdd:board sync'],
    ['tidy', 'Uporządkuj tablicę [tidy]', '/sdd:board tidy'],
    ['rebuild', 'Odtwórz tablicę z plików [rebuild]', '/sdd:board rebuild'],
    ['processes', 'Procesy z działającej aplikacji [processes]', '/sdd:board processes'],
  ]);
  c.forEach(x => assert.ok(x.title && x.title.length > 20, x.id + ' title'));
});

test('AC-BC2: Tablica - lista po prawej za PDF, ukryta w demo i PDF, wybor -> claudeAsk, rebuild -> wersja', () => {
  const h = read('index.html');
  const tbar = h.slice(h.indexOf('<div class="tbar">'), h.indexOf('</div>', h.indexOf('<div class="tbar">')));
  const sel = tbar.indexOf('id="claudecmd"');
  assert.ok(sel > 0, '#claudecmd w .tbar');
  assert.ok(sel > tbar.indexOf('id="pdf"') && sel > tbar.indexOf('id="view"'), 'za PDF i widokiem');
  assert.match(tbar, /<select[^>]*id="claudecmd"[^>]*>\s*<option value="">Claude: porządek…<\/option>/);
  assert.match(h, /#claudecmd\{[^}]*margin-left:auto/);
  assert.match(h, /body\.demo #claudecmd/);
  assert.match(h, /SddUI\.boardCmds\(\)/);
  assert.match(h, /SddUI\.claudeAsk\(/);
  assert.match(h, /PDF_MODE[^\n]*claudecmd|claudecmd[^\n]*PDF_MODE/);
  assert.match(h, /przed odtworzeniem tablicy/);
  assert.match(h, /\/api\/copy\/version/);
});

test('AC-BC3: claudeAsk - widok czat, tekst zaznaczony w polu, start gdy nie dziala, bez okna false', () => {
  const s = read('ui.js');
  assert.strictEqual(typeof ui.claudeAsk, 'function');
  assert.strictEqual(ui.claudeAsk('/sdd:board tidy'), false, 'bez okna Claude (node, demo)');
  const dock = s.slice(s.indexOf('function claudeDock('), s.indexOf('// ------------------------------------------------ widok okna'));
  assert.match(dock, /askNow\s*=\s*function\s*\(text\)/);
  const ask = s.slice(s.indexOf('askNow = function'), s.indexOf('askNow = function') + 1400);
  assert.match(ask, /fetch\('\/api\/chat'\)/);
  assert.match(ask, /fetch\('\/api\/term'\)/);
  assert.match(ask, /prefs\.view\s*=\s*'chat'/);
  assert.match(ask, /prefs\.view\s*=\s*'code'/);
  assert.match(ask, /api\('\/api\/term\/input',\s*\{\s*data:\s*text\s*\}\)/, 'terminal: tekst bez Enter');
  assert.doesNotMatch(ask, /\\r|\\n/, 'bez znaku Enter');
  assert.match(ask, /open\(true\)/);
  assert.match(s, /function askFill\(\)\s*\{[^}]*hinted/);
  assert.match(s, /chatStart\(!!cstate\.canResume\)/);
  // pole wypelniane, gdy rozmowa ruszy
  assert.match(s.slice(s.indexOf('function chatShow('), s.indexOf('function chatRender(')), /askFill\(\)/);
});

test('AC-BC4: skill - /sdd:board tidy, zasady, rebuild pyta przed nadpisaniem', () => {
  const k = fs.readFileSync(path.join(B, '..', 'skills', 'board', 'SKILL.md'), 'utf8');
  assert.match(k.split('\n---')[0], /description:[^\n]*(tidy|uporzadkuj tablice)/i);
  const t = k.slice(k.indexOf('`/sdd:board tidy`'));
  assert.ok(k.includes('## Porzadek na tablicy (`/sdd:board tidy`)'), 'sekcja');
  ['duplikat', 'najpierw propozycj', 'tak', 'by: "człowiek"', 'tylko `board.json`', 'nie zmieniasz tresci', 'CHANGELOG.md'].forEach(w =>
    assert.ok(t.toLowerCase().includes(w.toLowerCase()), w));
  const r = k.slice(k.indexOf('## Odtworzenie tablicy z plikow'), k.indexOf('## Procesy z dzialajacej aplikacji'));
  assert.match(r, /zniknie/);
  assert.match(r, /"tak"/);
});

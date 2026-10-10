// Kopia w repozytorium - konfiguracja, przewodnik i interfejs (0.41.0, docs/specs/repo-copy.md AC-RC11, AC-RC12).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
const info = require('../info');
const ui = require('../ui.js');
const read = f => fs.readFileSync(path.join(B, f), 'utf8');

test('AC-RC11: info.js - COPIES, yamlSet({copy}), copyMode, szablon, przewodnik', () => {
  assert.deepStrictEqual(info.COPIES, ['local', 'remote']);
  const y = 'project: "x"\nlevel: full\nbacklog: none          # none | linear\nowners:\n';
  const a = info.yamlSet(y, { copy: 'remote' });
  assert.match(a, /^backlog: none {10}# none \| linear\ncopy: remote +# local \| remote/m);
  const b = info.yamlSet(a, { copy: 'local' });
  assert.match(b, /^copy: local +# local \| remote/m);
  assert.strictEqual((b.match(/^copy:/gm) || []).length, 1);
  assert.throws(() => info.yamlSet(y, { copy: 'gitlab' }), /local, remote/);
  assert.strictEqual(info.copyMode(a), 'remote');
  assert.strictEqual(info.copyMode(y), 'local');
  assert.match(fs.readFileSync(path.join(B, '..', 'templates', 'requirements', 'SDD.yaml'), 'utf8'), /^copy: local +# local \| remote/m);
  const g = info.guide().sections.find(s => s.title === 'Kopia i wersje');
  assert.ok(g, 'sekcja Kopia i wersje');
  const txt = g.items.join('\n');
  ['sdd-kopia/', 'Zapisz wersję', 'git checkout', 'git diff main', '10 MB', 'tylko na tym komputerze'].forEach(t => assert.ok(txt.includes(t), t));
});

test('AC-RC12: copyLive dla kazdego stanu, tokeny, showCopy na stronach, sekcja #kopia bez slow gita', () => {
  const now = new Date(2026, 9, 10, 15, 0);
  const at = new Date(2026, 9, 10, 14, 32).toISOString(), old = new Date(2026, 9, 9, 9, 5).toISOString();
  assert.strictEqual(ui.copyLive(null, '', now), null);
  const ok = ui.copyLive({ state: 'ok', at }, '', now);
  assert.strictEqual(ok.cls, 'ok'); assert.match(ok.html, /kopia 14:32/); assert.doesNotMatch(ok.html, /href/);
  assert.match(ui.copyLive({ state: 'ok', at: old }, '', now).html, /kopia 09\.10 09:05/);
  const loc = ui.copyLive({ state: 'local', at }, '/x', now);
  assert.strictEqual(loc.cls, 'idle'); assert.match(loc.html, /kopia tylko na tym komputerze/); assert.match(loc.html, /href="\/x\/config#kopia"/);
  const ng = ui.copyLive({ state: 'nogit' }, '', now);
  assert.strictEqual(ng.cls, 'warn'); assert.match(ng.html, /brak kopii/); assert.match(ng.html, /title="[^"]*nie jest repozytorium/);
  const no = ui.copyLive({ state: 'noorigin', at }, '', now);
  assert.strictEqual(no.cls, 'warn'); assert.match(no.html, /kopia niewysłana/); assert.match(no.html, /adresu serwera/);
  const un = ui.copyLive({ state: 'unsent', at, error: '<b>fatal</b>' }, '', now);
  assert.strictEqual(un.cls, 'warn'); assert.match(un.html, /kopia niewysłana/); assert.match(un.html, /&lt;b&gt;fatal/);
  assert.strictEqual(typeof ui.showCopy, 'function');
  const css = read('ui.css');
  assert.strictEqual((css.match(/--warn:/g) || []).length, 3);
  assert.strictEqual((css.match(/--idle:/g) || []).length, 3);
  assert.match(css, /\.statusbar \.live\.warn i\{background:var\(--warn\)\}/);
  assert.match(css, /\.statusbar \.live\.idle i\{background:var\(--idle\)\}/);
  assert.match(css, /\.live\.off #copy\{display:none\}/);
  assert.match(read('progress.html'), /SddUI\.showCopy\(p\.copy\)/);
  assert.match(read('index.html'), /SddUI\.showCopy\(b\._copy\)/);
  assert.match(read('info.html'), /SddUI\.showCopy\(p\.copy\)/);
  const h = read('info.html');
  ['id="kopia"', 'id="f-copy"', 'id="copynow"', 'id="verlist"', 'id="f-ver"', 'id="versave"', 'Zapisz wersję', 'Wysyłaj kopię na serwer'].forEach(t => assert.ok(h.includes(t), t));
  const sec = h.slice(h.indexOf('KOPIA I WERSJE (0.41.0, docs/specs'), h.indexOf('KOPIA I WERSJE koniec'));
  assert.ok(sec.length > 100, 'blok sekcji');
  assert.doesNotMatch(sec.replace(/<code[^>]*>[\s\S]*?<\/code>|\/\/[^\n]*|class="[^"]*"/g, ''), /\b(commit|snapshot)\b|\btag\b/i);
});

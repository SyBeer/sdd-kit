// Nowy wyglad interfejsu - wspolna rama, Panel, Jak to dziala, Konfiguracja. Kryteria z docs/specs/ui-frame.md (AC-F1..AC-F8, zmiana 0.34.0).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ui = require('../ui.js');
const info = require('../info.js');

const B = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(B, f), 'utf8');
const css = read('ui.css'), prog = read('progress.html'), inf = read('info.html'), board = read('index.html');

test('AC-F1: wspolna rama - tokeny w ui.css, pasek stanu, naglowek 36 px na kazdej stronie, motyw jednym przyciskiem', () => {
  ['--bg:#f3efe6', '--cur-row:#fdf6ea', '--accent:#e39a3b', '--hot-ink:#c2412f', '--status:#2a2823', '--bg:#1b1a17', '--cur-row:#2a261f']
    .forEach(t => assert.ok(css.includes(t), t));
  assert.match(css, /\.statusbar\{min-height:26px/);
  assert.match(css, /\.topbar\{height:36px/);
  assert.match(css, /\.chrome\{position:sticky;top:0/);
  for (const page of ['panel', 'board', 'module', 'guide', 'config']) {
    const h = ui.topbarHtml(page, '', 'light');
    assert.match(h, /class="logo"/, page);
    assert.match(h, /<span class="slot-mod"><\/span>/, page);
    assert.match(h, /class="ic theme-btn" data-next="dark" title="Ciemny motyw"[^>]*>☾</, page);
    assert.match(h, /class="cl-btn"/, page);
    assert.doesNotMatch(h, /name="sdd-theme"|class="xlink"/, page);
    assert.strictEqual(/class="slot-q"/.test(h), page === 'board', page);
  }
  assert.match(ui.topbarHtml('panel', '/demo', 'dark'), /← Twój moduł/);
  assert.doesNotMatch(ui.topbarHtml('panel', '/demo', 'dark'), /cl-btn/);
  // strony: pasek stanu i przelacznik modulu jako gniazdo naglowka
  [prog, inf, board].forEach(h => {
    assert.match(h, /<div class="statusbar">/);
    assert.match(h, /<span class="modsw" data-slot="mod">/);
    assert.match(h, /id="conn"/);
    assert.doesNotMatch(h, /Wymagania do modułu:/);
  });
  // wersja tylko w podpowiedzi logo, w pasku tylko ostrzezenie
  assert.match(read('ui.js'), /el\.hidden = !x\.stale;/);
});

test('AC-F2: Konfiguracja jako ⚙ w naglowku, nie zakladka', () => {
  assert.deepStrictEqual(ui.tabs('panel').map(t => t.short), ['Panel', 'Tablica', 'Moduł', 'Jak działa']);
  assert.match(ui.topbarHtml('config', '', 'light'), /<a class="ic cfg" href="\/config" title="Konfiguracja" aria-label="Konfiguracja" aria-current="page">/);
  assert.doesNotMatch(ui.topbarHtml('panel', '', 'light'), /cfg"[^>]*aria-current/);
  assert.match(ui.topbarHtml('guide', '/demo', 'light'), /href="\/demo\/config"/);
  assert.doesNotMatch(ui.topbarHtml('board', '/demo/start', 'light'), /class="ic cfg"/);
});

test('AC-F3: Panel - aktualny krok, pasek etapow, akordeon, karta boczna; id dla skryptu', () => {
  ['id="app"', 'id="files"', 'id="browse"', 'id="dlg"', 'id="modform"', 'id="meta"', 'id="sright"', 'id="live"'].forEach(t => assert.ok(prog.includes(t), t));
  ['<code id="nextcmd">', 'id="copy">Kopiuj', 'AKTUALNY KROK', "' / 06</span>'", 'class="box stbar"', 'class="box acc"', 'class="box side"',
    'Blokuje dev', 'Czeka na biznes', 'Ostatnie zmiany', "'Skopiowano'", 'SddUI.cardOpen'].forEach(t => assert.ok(prog.includes(t), t));
  // stany etapu i kolory paska
  ["cls:'stale',tag:'nieaktualne'", "tag:'gotowe · '+s.partial", "cls:'active',tag:'w toku'", "cls:'done',tag:'gotowe'", "tag:'nie zaczęte'"]
    .forEach(t => assert.ok(prog.includes(t), t));
  assert.match(prog, /\.stbar button\.done::before\{background:#5bb86a\}/);
  assert.match(prog, /\.stbar button\.stale::before\{background:repeating-linear-gradient/);
  assert.match(prog, /grid-template-columns:12px 22px 84px minmax\(0,1fr\) auto/);
  // wpis CHANGELOG.md -> data, obszar, tresc, zrodlo
  assert.match(prog, /function logItem\(l\)/);
});

test('AC-F4: countList - naglowek z ×, ID · tresc · znacznik, "do" / "skad"', () => {
  const h = ui.countList('otwarte', { file: '01-interview/QUESTIONS.md', items: [
    { id: 'Q-1', title: 'Kto <b>', status: 'otwarte', note: 'do: sponsor · skąd: luka (a/bardzo/dluga/sciezka.md)' },
    { id: 'A-2', title: 'x', status: 'obalone' }, { id: 'R-3', title: 'y', status: 'zatwierdzone' }] }, true);
  assert.match(h, /<b>3<\/b> otwarte/);
  assert.match(h, /<code>01-interview\/QUESTIONS\.md<\/code>/);
  assert.match(h, /class="clx" aria-label="Zamknij listę"/);
  assert.match(h, /class="tag work" title="otwarte"/);
  assert.match(h, /class="tag bad"/);
  assert.match(h, /class="tag ok"/);
  assert.match(h, /<span class="ml">do<\/span> sponsor/);
  assert.match(h, /<span class="ml">skąd<\/span> <span class="src">luka \(a\/bardzo\/dluga\/sciezka\.md\)<\/span>/);
  assert.match(h, /Kto &lt;b&gt;/);
  assert.doesNotMatch(ui.countList('x', { items: [] }), /clx/);
  assert.strictEqual(ui.metaHtml('zdecydował: sponsor'), '<span>zdecydował: sponsor</span>');
  // lista pytan nie dubluje otwartego licznika "otwarte"
  assert.match(prog, /questionBox\(s\.questions\|\|\[\],countOpen\.interview==='open'\)/);
});

test('AC-F5: pasek stanu Panelu - blokery i pytania u biznesu', () => {
  ["'nic nie blokuje dev'", "'brak pytań u biznesu'", "'blokuje dev'", "'czeka na biznes'", "class=\"dotn'+(n?' hot':'')"].forEach(t => assert.ok(prog.includes(t), t));
  assert.match(css, /\.statusbar \.dotn\{[^}]*background:#2f9e5b/);
  assert.match(css, /\.statusbar \.dotn\.hot\{background:var\(--hot-ink\)\}/);
});

test('AC-F6: Jak to dziala - spis tresci sticky ze scroll-spy, numerowane karty, uklad sekcji', () => {
  assert.match(inf, /\.toc\{flex:0 0 190px;position:sticky/);
  assert.match(inf, /function tocSpy\(\)/);
  assert.match(inf, /innerHeight\+window\.scrollY>=document\.documentElement\.scrollHeight-2/);
  assert.match(inf, /<span class="nn">'\+nn\+' · <\/span>/);
  ['Źródła i wiarygodność', 'Identyfikatory i statusy', 'Rodzaj modułu i kontrakt', 'Tablica warsztatowa', 'Integracja z Redmine', 'Tablica i panel']
    .forEach(t => assert.ok(inf.includes("'" + t + "':function(s)"), t));
  // ksztalt tekstow z info.js, na ktorym stoi uklad (zmiana tekstu = zwykla lista, ale lepiej wiedziec)
  const g = info.guide(), sec = t => g.sections.find(s => s.title === t);
  assert.strictEqual(sec('Źródła i wiarygodność').items.filter(i => /^\[(Biz|App|Dok|AI)\] – /.test(i)).length, 4);
  assert.match(sec('Rodzaj modułu i kontrakt').items[0], /^(.*?): monolit - (.*?); serwis - (.*?)\. (Pytanie rozstrzygające: .*)$/);
  assert.ok(sec('Rodzaj modułu i kontrakt').items.some(i => /^Monolit: .* Serwis: /.test(i)));
  assert.ok(sec('Identyfikatory i statusy').items.some(i => /^Statusy: robocze → zatwierdzone; zakwestionowane \(Q-xxx\), /.test(i)));
  assert.ok(sec('Integracja z Redmine').items.every(i => /^\*\*.+?\*\* – /.test(i)));
});

test('AC-F7: Konfiguracja - id pol, segmenty nad ukrytym select, usedRoles z serwera, pasek zapisu', () => {
  ['f-project', 'f-backlog', 'rmf', 'f-rmurl', 'f-rmproj', 'f-rmkey', 'delkey', 'keyerr', 'owners', 'addrole', 'savesdd', 'resetsdd',
    'sdderr', 'katalog', 'f-root', 'checkroot', 'rootprev', 'rooterr', 'f-add', 'addmod', 'adderr', 'setroot', 'f-kind']
    .forEach(id => assert.ok(inf.includes("id=\"" + id + "\"") || inf.includes("id=\"'+id+'\"") && /seg\('f-(backlog|kind)'/.test(inf), id));
  assert.match(inf, /'<select id="'\+id\+'" hidden'/);
  assert.match(inf, /seg\('f-backlog'/);
  assert.match(inf, /seg\('f-kind'/);
  // atrybuty anty-autouzupelniania bez zmian
  ['f-rmurl', 'f-rmproj', 'f-rmkey'].forEach(id => assert.match(inf, new RegExp('id="' + id + '"[^>]*autocomplete="off"[^>]*data-1p-ignore data-lpignore="true" data-form-type="other"'), id));
  ["'niezapisane zmiany'", "'zapisano w SDD.yaml'", "'bez zmian'", 'użyta w plikach', "'ZMIENIA CLAUDE'".replace(/'/g, ''), 'Przykład gotowego modułu ↗']
    .forEach(t => assert.ok(inf.includes(t), t));
  assert.match(inf, /\.savebar\{position:sticky;bottom:0/);
  assert.match(read('server.js'), /usedRoles: info\.roleChangeBlocked\(ctx\.req, owners, \[\]\)\.map\(b => b\.role\)/);
  // regula: rola z nazwa w plikach = uzyta
  const req = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-uf-')), 'requirements');
  fs.mkdirSync(path.join(req, '01-interview'), { recursive: true });
  fs.writeFileSync(path.join(req, '01-interview', 'DECISIONS.md'), '| D-001 | x | wlasciciel procesu |\n');
  const owners = [{ role: 'właściciel procesu', approves: ['R'] }, { role: 'księgowość', approves: [] }];
  assert.deepStrictEqual(info.roleChangeBlocked(req, owners, []).map(b => b.role), ['właściciel procesu']);
});

test('AC-F8: telefon - rama nie stoi, zakladki przewijaja sie, etykieta nad polem, spis tresci nad trescia', () => {
  const phone = css.slice(css.indexOf('@media (max-width:640px){\n  .chrome'));
  assert.match(phone, /\.chrome\{position:static\}/);
  assert.match(phone, /\.topbar\{height:auto;min-height:36px;flex-wrap:wrap/);
  assert.match(css, /\.topbar \.tabs\{[^}]*overflow-x:auto/);
  assert.match(inf, /@media\(max-width:640px\)\{[\s\S]*\.toc\{position:static;flex-basis:100%\}[\s\S]*\.fr2 \.fl\{flex-basis:100%\}/);
});

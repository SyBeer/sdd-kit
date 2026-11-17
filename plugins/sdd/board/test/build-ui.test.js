// "Buduj" - interfejs (0.44.0, docs/specs/build.md AC-BD5).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../ui.js');
const bd = require('../build.js');
const info = fs.readFileSync(path.join(__dirname, '..', 'info.html'), 'utf8');
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('AC-BD5 (AC-020-3): mlotek w naglowku za dyskietka, przed zebatka; nie w demo', () => {
  const h = ui.topbarHtml('panel', '', 'light');
  assert.match(h, /class="ic save"[\s\S]*?<\/button><button type="button" class="ic build"[^>]*aria-label="Buduj"[^>]*>[\s\S]*?<\/button><a class="ic cfg"/);
  assert.match(h, /class="ic build"[^>]*><svg[^>]*stroke="currentColor"/);
  assert.doesNotMatch(ui.topbarHtml('panel', '/demo', 'light'), /class="ic build"/);
});

test('AC-BD5: branchFor w przegladarce = na serwerze (podglad galezi)', () => {
  [['R-002', 'Import odczytów z CSV - cały plik albo nic'], ['', 'Popraw ekran logowania'], ['R-9', 'x'.repeat(200)], ['R-001', 'Łódź – żółć']].forEach(([id, t]) =>
    assert.strictEqual(ui.branchFor(id, t), bd.branchFor(id, t), id + ' ' + t));
});

test('AC-BD5 (AC-020-1, AC-020-3): buildPopHtml - wybor zadania, wlasny opis, podglad galezi; w trakcie Zatrzymaj; bez gita', () => {
  const tasks = [{ id: 'R-001', title: 'Import <CSV>', status: 'zatwierdzone' }, { id: 'R-002', title: 'Raport', status: 'robocze' }];
  const idle = ui.buildPopHtml({ git: true, tasks, state: { status: 'idle' } }, '');
  assert.match(idle, /<select[^>]*id="bd-task"/);
  assert.match(idle, /<option value="0">R-001 Import &lt;CSV&gt; · zatwierdzone<\/option>/);
  assert.match(idle, /<option value="own">Własne zadanie…<\/option>/);
  assert.match(idle, /<input[^>]*id="bd-own"[^>]*hidden/);
  assert.match(idle, /id="bd-branch"[^>]*>feature\/r-001-import-csv</);
  assert.match(idle, /<button[^>]*id="bd-go"[^>]*>Buduj na nowej gałęzi<\/button>/);
  assert.match(text(idle), /autonomicznie/i);
  const last = ui.buildPopHtml({ git: true, tasks, state: { status: 'done', branch: 'feature/r-001-x' } }, '');
  assert.match(last, /href="\/build"/);
  assert.match(text(last), /Ostatnie budowanie: gotowe/);
  const run = ui.buildPopHtml({ git: true, tasks, state: { status: 'running', running: true, task: { id: 'R-001', title: 'Import' }, branch: 'feature/r-001-import' } }, '');
  assert.match(run, /<button[^>]*id="bd-stop"[^>]*>Zatrzymaj<\/button>/);
  assert.match(run, /<a href="\/build"[^>]*>Postęp budowania<\/a>/);
  assert.match(text(run), /feature\/r-001-import/);
  assert.doesNotMatch(run, /id="bd-go"/);
  assert.match(text(ui.buildPopHtml({ git: false, tasks: [], state: { status: 'idle' } }, '')), /repozytorium git/);
});

test('AC-BD5 (AC-022-1, AC-022-2): Konfiguracja - karta Budowanie z promptem; strona /build', () => {
  ['id="budowanie"', 'id="f-bprompt"', 'id="bpsave"', 'id="bpreset"', '/api/build/prompt', '{zadanie}', 'build-prompt.md'].forEach(t => assert.ok(info.includes(t), t));
  assert.match(info, /\(module\|guide\|config\|build[|)]/);  // od 0.49.0 takze report (AC-79)
  assert.match(info, /function renderBuild\(/);
  assert.match(info, /SddUI\.liveSource\(BASE\+'\/build-events'/);
  assert.match(info, /\/api\/build\/stop/);
});

test('AC-BD9 (AC-021-1, AC-021-3): /build - blokada z komenda, blad narzedzia szary, lista zablokowanych', () => {
  const at = info.indexOf('function drawBuild('), d = info.slice(at, info.indexOf('// KOPIA I WERSJE (0.41.0', at));
  assert.ok(d.length > 200, 'fragment drawBuild');
  assert.match(d, /ev\.kind==='denied'[^\n]*zablokowane: [^\n]*ev\.command/);
  assert.match(d, /ev\.kind==='toolerr'[^\n]*błąd narzędzia[^\n]*Claude poprawia/);
  assert.match(d, /class="bl-err"/);
  assert.match(d, /Zablokowane komendy/);
  assert.match(d, /s\.denied/);
  assert.match(info, /\.bl-err\{[^}]*var\(--muted\)/);
});

test('AC-BD14 (AC-020-4): alreadyHtml - ostrzezenie o zrobionym wymaganiu i istniejacej galezi; okienko sprawdza i wysyla force', () => {
  const h = ui.alreadyHtml({ commits: [{ hash: 'fdcd855', subject: 'feat(dashboard): magazyn <R-021>', date: '2026-10-12T23:58:41+02:00' }], tag: 'v3.6.0', branch: 'main', branches: ['feature/r-021-stara'] }, 'R-021');
  const t = text(h);
  assert.match(t, /R-021 jest już na gałęzi main/);
  assert.match(h, /feat\(dashboard\): magazyn &lt;R-021&gt;/);
  assert.match(t, /wersja v3\.6\.0/);
  assert.match(t, /Jest już gałąź feature\/r-021-stara/);
  assert.match(t, /Budować mimo to\?/);
  assert.strictEqual(ui.alreadyHtml({ commits: [], tag: null, branch: 'main', branches: [] }, 'R-021'), '');
  // ta sama galaz co budowana = kontynuacja, bez ostrzezenia o galezi
  assert.strictEqual(ui.alreadyHtml({ commits: [], tag: null, branch: 'main', branches: ['feature/r-021-x'] }, 'R-021', 'feature/r-021-x'), '');
  assert.match(text(ui.alreadyHtml({ commits: [], tag: null, branch: 'main', branches: ['feature/r-021-x', 'feature/r-021-y'] }, 'R-021', 'feature/r-021-x')), /Jest już gałąź feature\/r-021-y \(/);
  assert.match(text(ui.alreadyHtml({ commits: [{ hash: 'a', subject: 's', date: '' }], tag: null, branch: 'main', branches: [] }, 'R-1')), /jeszcze niewydane/);
  const s = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
  const pop = s.slice(s.indexOf('function buildPop('), s.indexOf('// Polaczenie na zywo (0.42.0'));
  assert.match(pop, /\/api\/build\/check\?id=/);
  assert.match(pop, /Buduj mimo to/);
  assert.match(pop, /force:\s*true/);
  assert.match(pop, /id="bd-warn"|#bd-warn/);
});

test('AC-BD28 (AC-020-5): gateReasons/gateHtml - ostrzezenie z powodem przed budowaniem, bez blokady', () => {
  const ok = { report: true, stale: false, readiness: 100, blocking: [] };
  const R = s => ({ task: { id: 'R-001', title: 'Import', status: s } });
  assert.deepStrictEqual(ui.gateReasons(ok, R('zatwierdzone (właściciel procesu, 2026-11-17)')), [], 'PRD zamkniete - bez ostrzezenia');
  const own = ui.gateReasons(ok, { title: 'popraw logowanie' });
  assert.strictEqual(own.length, 1); assert.match(own[0], /własne zadanie[^]*poza PRD/i);
  const nz = ui.gateReasons(ok, R('robocze'));
  assert.strictEqual(nz.length, 1); assert.match(nz[0], /R-001 nie jest zatwierdzone[^]*robocze/);
  assert.match(ui.gateReasons({ report: false, stale: false, readiness: null, blocking: [] }, R('zatwierdzone')).join(' '), /brak raportu walidacji/i);
  assert.match(ui.gateReasons({ report: true, stale: true, readiness: 100, blocking: [] }, R('zatwierdzone')).join(' '), /nieaktualny/i);
  assert.match(ui.gateReasons({ report: true, stale: false, readiness: 80, blocking: [] }, R('zatwierdzone')).join(' '), /gotowość 80%/i);
  assert.match(ui.gateReasons({ report: true, stale: false, readiness: 100, blocking: ['Q-001', 'Q-007'] }, R('zatwierdzone')).join(' '), /pytania blokujące: Q-001, Q-007/i);
  assert.strictEqual(ui.gateReasons(null, R('zatwierdzone')).length, 1, 'brak danych = brak raportu');
  const h = ui.gateHtml(['brak raportu walidacji', 'a<b']);
  assert.match(text(h), /brak raportu walidacji/);
  assert.match(h, /a&lt;b/);
  assert.match(text(h), /Możesz budować mimo to/);
  assert.strictEqual(ui.gateHtml([]), '');
  assert.match(ui.buildPopHtml({ git: true, tasks: [], state: { status: 'idle' } }, ''), /id="bd-gate"/);
  const s = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
  const pop = s.slice(s.indexOf('function buildPop('), s.indexOf('// Polaczenie na zywo (0.42.0'));
  assert.match(pop, /gateReasons\(info\.gate/);
  assert.match(pop, /#bd-gate/);
});

// Ikona "Zapisz wersję" przy zebatce i polaczenia na zywo (0.42.0, docs/specs/quick-save.md).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
const ui = require('../ui.js');
const read = f => fs.readFileSync(path.join(B, f), 'utf8');
const GIT_WORDS = /commit|\btag\b|snapshot/i;

test('AC-QS1: ikona zapisu tuz przed zebatka, w demo jej nie ma', () => {
  const h = ui.topbarHtml('panel', '', 'light');
  assert.match(h, /<button type="button" class="ic save"[^>]*aria-label="Zapisz wersję"[^>]*>[\s\S]*?<\/button><a class="ic cfg"/);
  assert.match(h, /class="ic save"[^>]*aria-expanded="false"/);
  assert.match(h, /class="ic save"[^>]*><svg[^>]*fill="none"[^>]*stroke="currentColor"/);
  const d = ui.topbarHtml('panel', '/demo', 'light');
  assert.doesNotMatch(d, /class="ic save"/);
});

test('AC-QS2: okienko zapisu - pole, przycisk, link do wszystkich wersji, bez slow gita', () => {
  const h = ui.savePopHtml('');
  assert.match(h, /<input[^>]*id="qs-name"/);
  assert.match(h, /<button[^>]*id="qs-save"[^>]*>Zapisz wersję<\/button>/);
  assert.match(h, /<a href="\/config#kopia"[^>]*>Zobacz poprzednie wersje<\/a>/);
  assert.match(h, /id="qs-msg"/);
  assert.doesNotMatch(h.replace(/(class|id)="[^"]*"/g, ''), GIT_WORDS);
});

test('AC-QS3: wynik zapisu - sukces, na serwerze, blad, escapowanie', () => {
  const ok = ui.saveResult({ name: 'pokazane <b>' }, null);
  assert.deepStrictEqual(ok, { ok: true, html: 'Zapisano: pokazane &lt;b&gt;' });
  assert.strictEqual(ui.saveResult({ name: 'x', version: { ok: true, sent: true } }, null).html, 'Zapisano: x · na serwerze');
  assert.strictEqual(ui.saveResult({ name: 'x', version: { ok: true, sent: false, error: '' } }, null).html, 'Zapisano: x');
  const err = ui.saveResult(null, new Error('Wersja „x” z 2026-10-10 już jest'));
  assert.deepStrictEqual(err, { ok: false, html: 'Wersja „x” z 2026-10-10 już jest' });
});

test('AC-QS5: brak odpowiedzi serwera - czytelny komunikat zamiast cichego czekania', () => {
  const e = new Error('The operation was aborted.'); e.name = 'AbortError';
  assert.deepStrictEqual(ui.saveResult(null, e), { ok: false, html: 'Serwer nie odpowiada. Zamknij albo odśwież inne karty panelu sdd-kit i spróbuj ponownie.' });
  assert.match(read('ui.js'), /Zapisuję…/);
  assert.match(read('ui.js'), /AbortController/);
});

// atrapa EventSource i dokumentu - pomocnik dostaje je przez env
function fakeEnv() {
  const made = [];
  function ES(url) { this.url = url; this.closed = false; made.push(this); }
  ES.prototype.close = function () { this.closed = true; };
  const listeners = [];
  const doc = { hidden: false, addEventListener: (ev, fn) => { if (ev === 'visibilitychange') listeners.push(fn); } };
  const flip = hidden => { doc.hidden = hidden; listeners.forEach(fn => fn()); };
  return { env: { EventSource: ES, document: doc }, made, flip };
}

test('AC-LC1: liveSource zamyka polaczenie w tle i otwiera po powrocie, nigdy dwa naraz', () => {
  const { env, made, flip } = fakeEnv();
  const seen = { open: 0, msg: [], err: 0 };
  ui.liveSource('/x/events', { open: () => seen.open++, message: e => seen.msg.push(e.data), error: () => seen.err++ }, env);
  assert.strictEqual(made.length, 1);
  assert.strictEqual(made[0].url, '/x/events');
  made[0].onopen(); made[0].onmessage({ data: 'a' }); made[0].onerror();
  assert.deepStrictEqual(seen, { open: 1, msg: ['a'], err: 1 });
  flip(true);
  assert.strictEqual(made[0].closed, true);
  flip(true);
  assert.strictEqual(made.length, 1, 'schowana drugi raz - bez nowego');
  flip(false);
  assert.strictEqual(made.length, 2);
  made[1].onopen(); made[1].onmessage({ data: 'b' });
  assert.deepStrictEqual(seen.msg, ['a', 'b']);
  assert.strictEqual(seen.open, 2);
  flip(false);
  assert.strictEqual(made.length, 2, 'widoczna przy otwartym polaczeniu - bez drugiego');
});

test('AC-LC1: liveSource w schowanej karcie nie otwiera polaczenia od razu', () => {
  const { env, made, flip } = fakeEnv();
  env.document.hidden = true;
  ui.liveSource('/events', {}, env);
  assert.strictEqual(made.length, 0);
  flip(false);
  assert.strictEqual(made.length, 1);
});

test('AC-LC1: retry - po bledzie zamyka i laczy ponownie po czasie, w tle czeka do powrotu', () => {
  const { env, made, flip } = fakeEnv();
  const timers = [];
  env.setTimeout = (fn, ms) => timers.push([fn, ms]);
  ui.liveSource('/events', { retry: 1500 }, env);
  made[0].onerror();
  assert.strictEqual(made[0].closed, true);
  assert.deepStrictEqual(timers.map(t => t[1]), [1500]);
  timers.shift()[0]();
  assert.strictEqual(made.length, 2);
  made[1].onerror();
  flip(true);
  timers.shift()[0]();
  assert.strictEqual(made.length, 2, 'schowana - bez ponowienia');
  flip(false);
  assert.strictEqual(made.length, 3);
});

test('AC-LC2: strony uzywaja liveSource zamiast new EventSource', () => {
  ['index.html', 'progress.html', 'info.html'].forEach(f => {
    const s = read(f);
    assert.doesNotMatch(s, /new EventSource\(/, f);
    assert.match(s, /SddUI\.liveSource\(/, f);
  });
});

test('AC-LC3: Konfiguracja / Modul / Jak to dziala wczytuja tresc od razu', () => {
  const s = read('info.html');
  const live = s.indexOf('SddUI.liveSource(');
  assert.ok(live > 0);
  // po podpieciu polaczenia, w galezi nie-demo, jest bezposrednie load()
  assert.match(s.slice(live, live + 900), /\}\);\s*load\(\);/);
});

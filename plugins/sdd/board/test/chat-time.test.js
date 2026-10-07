// Czas rozmowy i tematy zamiast liczby pytan (0.39.0, docs/specs/interview-style.md AC-IS12..AC-IS14,
// docs/specs/claude-chat.md AC-CH10). Uwaga usera 2026-10-08: "nie strasz liczba pytan albo pracy do zrobienia. zapytaj
// na poczatku ile czasu uzytkownik ma na rozmowe (pokaz zegar) i z listy tematow - zrob najpierw najwazniejsze".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
const skill = fs.readFileSync(path.join(B, '..', 'skills', 'interview', 'SKILL.md'), 'utf8');
const ui = require('../ui.js');

test('AC-IS12: BIZ - na poczatku pytanie o czas, bez liczby pytan i pracy', () => {
  assert.match(skill, /Ile masz dzis czasu na rozmowe\?/);
  assert.match(skill, /Nie podajesz liczby pytan/);
  assert.doesNotMatch(skill, /zostaly jeszcze dwa/);
});

test('AC-IS13: BIZ - tematy od najwazniejszego, zmiesc sie w czasie, `date` na starcie i przed pytaniem', () => {
  assert.match(skill, /tematy[^\n]*od najwazniejszego/i);
  assert.match(skill, /`date`/);
  assert.match(skill, /Na nastepny raz zostalo/);
});

test('AC-IS14: INZ bez zmian - liczba pytan na starcie zostaje', () => {
  assert.match(skill, /W stylu INZ na start powiedz, ile jest pytan/);
});

test('AC-CH10: czat - podpowiedzi czasu, zegar odliczajacy, czas z wiadomosci', () => {
  assert.strictEqual(ui.asksTime('Rozmawiam z Tobą jako właścicielem, tak? Ile masz dziś czasu na rozmowę?'), true);
  assert.strictEqual(ui.asksTime('Ile mamy czasu?'), true);
  assert.strictEqual(ui.asksTime('Teraz o cenach prądu.'), false);
  assert.strictEqual(ui.parseMinutes('mam 30 minut'), 30);
  assert.strictEqual(ui.parseMinutes('20 min'), 20);
  assert.strictEqual(ui.parseMinutes('1h'), 60);
  assert.strictEqual(ui.parseMinutes('godzinę'), 60);
  assert.strictEqual(ui.parseMinutes('pół godziny'), 30);
  assert.strictEqual(ui.parseMinutes('półtorej godziny'), 90);
  assert.strictEqual(ui.parseMinutes('nie wiem'), null);
  assert.strictEqual(ui.clockText(23 * 60e3 + 41e3), '23:41');
  assert.strictEqual(ui.clockText(-5e3), '0:00');
  assert.strictEqual(ui.clockState(10 * 60e3), '');
  assert.strictEqual(ui.clockState(4 * 60e3), 'low');
  assert.strictEqual(ui.clockState(0), 'over');
  const src = fs.readFileSync(path.join(B, 'ui.js'), 'utf8'), css = fs.readFileSync(path.join(B, 'ui.css'), 'utf8');
  ['cd-clock', 'cd-quick', 'data-min="15"', 'data-min="30"', 'data-min="60"', "'Mam ' +"].forEach(t => assert.ok(src.includes(t), t));
  assert.match(css, /\.cdock \.cd-clock\{/);
  assert.match(css, /\.cdock \.cd-clock\.low\{/);
});

// ---------------------------------------------------------------- 0.39.2: koniec czasu - decyduje rozmowca
test('AC-IS16: koniec czasu - nie urywasz, informujesz, ile pytan zostalo i ile czasu potrzeba; decyduje rozmowca', () => {
  assert.match(skill, /Nie przerywasz w polowie tematu/);
  assert.match(skill, /Czas, który mieliśmy, minął\. Zostały jeszcze/);
  assert.match(skill, /Kontynuujemy czy kończymy na dziś\?/);
  assert.match(skill, /decyduje rozmowca/);
  assert.match(skill, /srednie tempo/);
  assert.match(skill, /Na nastepny raz zostalo/);
});

test('AC-CH15: czat - podpowiedzi kontynuuj (+N min) / konczymy po pytaniu o kontynuacje', () => {
  assert.strictEqual(ui.asksContinue('Czas, który mieliśmy, minął. Zostały jeszcze 4 pytania – potrzebowałbym około 10 minut. Kontynuujemy czy kończymy na dziś?'), true);
  assert.strictEqual(ui.asksContinue('Teraz o cenach prądu.'), false);
  assert.strictEqual(ui.parseMinutes('potrzebowałbym około 10 minut. Kontynuujemy?'), 10);
  const src = fs.readFileSync(path.join(B, 'ui.js'), 'utf8');
  ['cd-cont', 'Kontynuujmy', 'Kończymy na dziś'].forEach(t => assert.ok(src.includes(t), t));
});

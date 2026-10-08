// Tabele w czacie i propozycja odpowiedzi w polu wiadomosci (0.40.1, docs/specs/claude-chat.md AC-CH16, AC-CH17).
// Uwagi usera 2026-10-08: tabela z podsumowania /sdd:domain wyswietlala sie jako tekst z kreskami;
// "jezeli spodziewasz sie odpowiedzi - wpisz propozycje w pole".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../ui.js');
const chat = require('../chat');
const src = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'ui.css'), 'utf8');

test('AC-CH16: tabela markdown -> <table> z naglowkiem, formatowanie w komorkach, przewijanie', () => {
  const h = ui.chatMd('Model jest zaktualizowany.\n\n| Część | Stan |\n|---|---|\n| Pojęcia | **25** |\n| Reguły | `BR-013` |\n\nKoniec.');
  assert.match(h, /<p>Model jest zaktualizowany\.<\/p><div class="tbl"><table><thead><tr><th>Część<\/th><th>Stan<\/th><\/tr><\/thead><tbody>/);
  assert.match(h, /<tr><td>Pojęcia<\/td><td><strong>25<\/strong><\/td><\/tr>/);
  assert.match(h, /<td><code>BR-013<\/code><\/td>/);
  assert.match(h, /<\/table><\/div><p>Koniec\.<\/p>/);
  assert.doesNotMatch(h, /\|---/);
  // tabela bez linii separatora - same wiersze danych
  assert.match(ui.chatMd('| a | b |\n| c | d |'), /<table><tbody><tr><td>a<\/td><td>b<\/td><\/tr><tr><td>c<\/td><td>d<\/td><\/tr><\/tbody><\/table>/);
  // HTML w komorce escapowany
  assert.match(ui.chatMd('| <b>x</b> |\n|---|\n| y |'), /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(css, /\.cdock \.m \.tbl\{[^}]*overflow-x:auto/);
  assert.doesNotMatch(chat.STYLE_PROMPT.biz, /bez[^.;]*tabel/);
});

test('AC-CH17: propozycja odpowiedzi - znacznik [[odpowiedz: …]] usuwany z dymka i wpisywany w pole', () => {
  const r = ui.replyHint('Zatwierdzasz jako właściciel instalacji, tak?\n\nOdpisz „zatwierdzam” albo podaj poprawkę.\n[[odpowiedź: Tak, zatwierdzam]]');
  assert.strictEqual(r.hint, 'Tak, zatwierdzam');
  assert.doesNotMatch(r.text, /\[\[/);
  assert.match(r.text, /podaj poprawkę\.$/);
  assert.strictEqual(ui.replyHint('x [[odpowiedz: Tak]]').hint, 'Tak');
  // bez znacznika - "Odpisz „…”" jako zapasowa propozycja
  assert.strictEqual(ui.replyHint('Odpisz „zatwierdzam” albo podaj poprawkę.').hint, 'zatwierdzam');
  assert.strictEqual(ui.replyHint('Zapisane. Teraz o samochodach.').hint, '');
  // instrukcja czatu prosi o znacznik
  assert.match(chat.STYLE_PROMPT.biz, /\[\[odpowiedz: /);
  // okno: propozycja w polu (zaznaczona - pisanie ja zastepuje), nie przy przyciskach czasu, raz na wiadomosc
  assert.match(src, /hintFor !== last/);
  assert.match(src, /cd-input[^\n]*hinted|hinted[^\n]*cd-input/);
  assert.match(src, /replyHint\(e\.text\)\.text/);
});

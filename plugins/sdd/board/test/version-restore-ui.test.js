// "Pokaż zmiany" i "Przywróć" - interfejs (0.42.0, docs/specs/version-restore.md AC-VR5, AC-VR6).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../ui.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'info.html'), 'utf8');
const GIT_WORDS = /commit|\btag\b|snapshot|\bdiff\b/i;
const text = h => h.replace(/<[^>]*>/g, ' ');

const F = [
  { file: '03-spec/PRD.md', status: 'changed', adds: 1, dels: 1, patch: '@@ -1 +1 @@\n-cel: <A>\n+cel: B\n kontekst', binary: false },
  { file: '00-intake/mail.md', status: 'added', adds: 2, dels: 0, patch: '+a\n+b', binary: false },
  { file: '02-domain/GLOSSARY.md', status: 'removed', adds: 0, dels: 1, patch: '-slowo', binary: false },
  { file: '00-intake/obraz.png', status: 'changed', adds: 0, dels: 0, patch: '', binary: true },
];
const part = (h, title) => { const i = h.indexOf(title); assert.ok(i >= 0, title); const j = h.indexOf('class="vh"', i + 1); return h.slice(i, j < 0 ? undefined : j); };

test('AC-VR5: diffHtml - dwie czesci: co nowego w tej wersji i od tej wersji do dzis', () => {
  const h = ui.diffHtml({ files: F, truncated: true, news: { base: { kind: 'version', name: 'test <3>' }, files: F.slice(0, 3), truncated: false } });
  assert.ok(h.indexOf('Co nowego w tej wersji') < h.indexOf('Od tej wersji do dziś'), 'kolejnosc czesci');
  const news = text(part(h, 'Co nowego w tej wersji')), since = text(part(h, 'Od tej wersji do dziś'));
  assert.match(news, /w porównaniu z wersją „test &lt;3&gt;”/);
  ['zmieniony', 'dodany w tej wersji', 'usunięty w tej wersji', 'było wcześniej', 'jest w tej wersji', '3 pliki'].forEach(t => assert.ok(news.includes(t), t));
  ['zmieniony', 'dodany po tej wersji', 'usunięty po tej wersji', 'było w wersji', 'jest teraz', 'plik binarny', '4 pliki'].forEach(t => assert.ok(since.includes(t), t));
  assert.match(since, /pokazano część zmian/i);
  assert.match(h, /<span class="dl del">-cel: &lt;A&gt;<\/span>/);
  assert.match(h, /<span class="dl add">\+cel: B<\/span>/);
  assert.match(h, /<details[^>]*>\s*<summary>[\s\S]*03-spec\/PRD\.md/);
  assert.doesNotMatch(text(h), GIT_WORDS);
  // najnowsza wersja zapisana po zmianach: nic od zapisu, ale widac co wniosla
  const n = text(ui.diffHtml({ files: [], truncated: false, news: { base: { kind: 'copy', name: '' }, files: F.slice(0, 1), truncated: false } }));
  assert.match(n, /Od tej wersji nic się nie zmieniło\./);
  assert.match(n, /z poprzednią kopią/);
  assert.match(n, /1 plik /);
  assert.match(text(ui.diffHtml({ files: [], truncated: false, news: { base: { kind: 'none', name: '' }, files: F.slice(1, 2), truncated: false } })), /pierwsza kopia/);
  assert.match(text(ui.diffHtml({ files: [], truncated: false, news: { base: { kind: 'version', name: 'x' }, files: [], truncated: false } })), /Ta wersja niczego nie zmieniła/);
});

test('AC-VS5: summaryHtml - zdania wg pliku, odmiana, skrocone wartosci, technika, escapowanie', () => {
  const sum = [
    { file: '01-interview/board.json', group: 'board', items: [
      { type: 'note', change: 'moved', text: '1', noteType: 'hot', from: 'Miesięczny odczyt', to: 'Rozliczenie miesiąca' },
      { type: 'note', change: 'added', text: '<b>', noteType: 'ev', lane: 'Pojazdy' },
      { type: 'note', change: 'text', noteType: 'cmd', from: 'stara', to: 'nowa' },
      { type: 'lane', change: 'added', name: 'Pojazdy' }] },
    { file: '01-interview/QUESTIONS.md', group: 'QUESTIONS', items: [
      { type: 'entry', change: 'added', key: 'Q-058', title: 'Czy cena kWh?', fields: [] },
      { type: 'entry', change: 'changed', key: 'Q-001', title: 'Pula', fields: [{ name: 'Status', from: 'otwarte', to: 'zaparkowane (nie blokuje go-live; luka w odczytach na granicy cyklu nigdy nie wystąpiła)' }] }] },
    { file: '01-interview/DECISIONS.md', group: 'DECISIONS', items: [{ type: 'entry', change: 'added', key: 'D-031', title: 'Cena kWh', fields: [] }] },
    { file: '03-spec/PRD.md', group: 'PRD', items: [{ type: 'entry', change: 'changed', key: 'R-001', title: 'Odczyt', fields: [{ name: 'Kryteria akceptacji' }, { name: 'Status', from: 'zatwierdzone', to: 'do zmiany' }] }] },
    { file: '02-domain/GLOSSARY.md', group: 'GLOSSARY', items: [{ type: 'entry', change: 'removed', key: 'Cena kWh', title: '', fields: [] }] },
    { file: '00-intake/mail.md', group: 'other', items: [{ type: 'file', change: 'added' }] },
  ];
  const h = ui.summaryHtml(sum), t = text(h).replace(/\s+/g, ' ');
  ['Tablica', 'Pytania', 'Decyzje', 'Wymagania (PRD)', 'Słownik', 'Inne pliki'].forEach(g => assert.ok(t.includes(g), g));
  [
    'Przeniesiono karteczkę „1” (nie wiemy): „Miesięczny odczyt” → „Rozliczenie miesiąca”',
    'Dodano karteczkę „&lt;b&gt;” (zdarzenie) w procesie „Pojazdy”',
    'Zmieniono treść karteczki (komenda): „stara” → „nowa”',
    'Nowy proces „Pojazdy”',
    'Nowe pytanie Q-058 – „Czy cena kWh?”',
    'Zmienione pytanie Q-001 – „Pula”: Status (otwarte → zaparkowane (nie blokuje go-live; luka w odczytach na…)',
    'Nowa decyzja D-031 – „Cena kWh”',
    'Zmienione wymaganie R-001 – „Odczyt”: Kryteria akceptacji, Status (zatwierdzone → do zmiany)',
    'Usunięte pojęcie „Cena kWh”',
    'Nowy plik 00-intake/mail.md',
  ].forEach(z => assert.ok(t.includes(z), z + '\n' + t));
  assert.doesNotMatch(t, GIT_WORDS);
  assert.match(text(ui.summaryHtml([{ file: '01-interview/board.json', group: 'board', items: [] }])), /Tylko zmiany techniczne/);
  // dlugie grupy zwiniete: 12 zdan + "i jeszcze N"
  const many = [{ file: 'q', group: 'QUESTIONS', items: Array.from({ length: 15 }, (_, i) => ({ type: 'entry', change: 'added', key: 'Q-' + (100 + i), title: 'x', fields: [] })) }];
  assert.match(text(ui.summaryHtml(many)), /i jeszcze 3/);
});

test('AC-VS5: diffHtml - zdania przed szczegolami, szczegoly zwiniete', () => {
  const sum = [{ file: '01-interview/board.json', group: 'board', items: [{ type: 'lane', change: 'added', name: 'Pojazdy' }] }];
  const h = ui.diffHtml({ files: F.slice(0, 1), truncated: false, summary: sum, news: { base: { kind: 'version', name: 'a' }, files: F.slice(0, 1), truncated: false, summary: sum } });
  const i = h.indexOf('Co się zmieniło w wymaganiach'), j = h.indexOf('Szczegóły – linie w plikach');
  assert.ok(i > 0 && j > i, 'zdania przed szczegolami');
  assert.match(h, /<details class="vdet"><summary>Szczegóły – linie w plikach/);
  assert.strictEqual((h.match(/Co się zmieniło w wymaganiach/g) || []).length, 2, 'w obu czesciach');
});

test('AC-VR5: restoreAsk - nazwa wersji, wersja bezpieczenstwa, bez slow gita', () => {
  const h = ui.restoreAsk({ name: 'test <1>', at: '2026-10-10T09:00:00+02:00', tag: 'sdd-wersja/m/2026-10-10-test-1' });
  assert.match(h, /test &lt;1&gt;/);
  assert.match(text(h), /przed przywróceniem/);
  assert.match(h, /data-vrestore-go="sdd-wersja\/m\/2026-10-10-test-1"/);
  assert.match(h, /data-vrestore-no/);
  assert.doesNotMatch(text(h), GIT_WORDS);
});

test('AC-VR6: Konfiguracja - przyciski przy wersjach, potwierdzenie, wywolania API', () => {
  assert.match(html, /data-vdiff="/);
  assert.match(html, /data-vrestore="/);
  assert.match(html, /SddUI\.restoreAsk\(/);
  assert.match(html, /SddUI\.diffHtml\(/);
  assert.match(html, /\/api\/copy\/diff\?tag=/);
  assert.match(html, /\/api\/copy\/restore/);
  // przyciski tylko poza demo
  assert.match(html, /demo\?'':'<span class="vbtns">/);
});

// "Co się zmieniło w wymaganiach" - porownanie po kluczach (0.42.0, docs/specs/version-summary.md AC-VS1..AC-VS3).
const test = require('node:test');
const assert = require('node:assert');
const rq = require('../req-changes');

const note = (id, o) => Object.assign({ id, lane: 'Miesięczny odczyt', col: 1, text: 't' + id, type: 'hot', by: 'człowiek',
  created: '2026-10-10T09:00:00Z', updated: '2026-10-10T09:00:00Z' }, o);
const board = (notes, o) => JSON.stringify(Object.assign({ title: 'FV', subtitle: '', lanes: ['Miesięczny odczyt', 'Rozliczenie miesiąca'], notes, updated: 'x' }, o), null, 2);

test('AC-VS1: boardChanges - karteczki po id, procesy, tytul; technika pominieta', () => {
  const a = board([note('n1', { text: '1' }), note('n2', { text: '2' }), note('n3', { text: 'stara' }), note('n4'), note('n5', { type: 'ev' }), note('n6')]);
  const b = board([
    note('n1', { text: '1', lane: 'Rozliczenie miesiąca', col: 6, updated: 'y' }),        // przeniesiona
    note('n2', { text: '2', col: 9, updated: 'z', synced: 's', by: 'agent' }),           // tylko technika
    note('n3', { text: 'nowa treść' }),                                                    // tresc
    note('n5', { type: 'cmd' }),                                                           // typ
    note('n6', { source: '[Biz] sesja' }),                                                 // inne pole
    note('n7', { text: 'dopisana', lane: 'Pojazdy' }),                                     // nowa
  ], { lanes: ['Miesięczny odczyt', 'Pojazdy'], title: 'FV Manager', updated: 'y' });
  const it = rq.boardChanges(a, b);
  const has = o => assert.ok(it.some(x => Object.keys(o).every(k => JSON.stringify(x[k]) === JSON.stringify(o[k]))), JSON.stringify(o) + '\n' + JSON.stringify(it, null, 1));
  has({ type: 'note', change: 'moved', text: '1', noteType: 'hot', from: 'Miesięczny odczyt', to: 'Rozliczenie miesiąca' });
  has({ type: 'note', change: 'text', from: 'stara', to: 'nowa treść' });
  has({ type: 'note', change: 'type', text: 'tn5', from: 'ev', to: 'cmd' });
  has({ type: 'note', change: 'fields', text: 'tn6', fields: ['source'] });
  has({ type: 'note', change: 'added', text: 'dopisana', noteType: 'hot', lane: 'Pojazdy' });
  has({ type: 'note', change: 'removed', text: 'tn4', lane: 'Miesięczny odczyt' });
  has({ type: 'lane', change: 'added', name: 'Pojazdy' });
  has({ type: 'lane', change: 'removed', name: 'Rozliczenie miesiąca' });
  has({ type: 'title', change: 'title', from: 'FV', to: 'FV Manager' });
  assert.ok(!it.some(x => x.text === '2'), 'n2: tylko kolumna, daty, by, synced');
  assert.strictEqual(it.length, 9);
  assert.deepStrictEqual(rq.boardChanges(a, a), []);
  assert.ok(rq.boardChanges('', b).some(x => x.change === 'added' && x.text === 'dopisana'), 'brak pliku = pusta tablica');
  assert.deepStrictEqual(rq.boardChanges('{zly', b), [], 'zly JSON - bez elementow');
  assert.deepStrictEqual(rq.boardChanges(a, 'nie json'), []);
});

const Q = rows => '# Rejestr pytan\n\n| ID | Pytanie | Status | Do kogo (rola) |\n|----|---------|--------|----------------|\n' +
  '| Q-xxx | wzor | otwarte | - |\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n';

test('AC-VS2: mdChanges - wiersze tabel: nowy, usuniety, zmienione kolumny, Status przed -> po; wzor pominiety', () => {
  const a = Q([['Q-001', 'Czy pula się kumuluje?', 'otwarte', 'właściciel'], ['Q-002', 'Net-billing?', 'otwarte', 'właściciel'], ['Q-003', 'Stare', 'otwarte', '-']]);
  const b = Q([['Q-001', 'Czy pula się kumuluje?', 'zamknięte', 'właściciel'], ['Q-002', 'Net-billing od kiedy?', 'otwarte', 'księgowa'], ['Q-004', 'Nowe pytanie o cenę kWh, które jest bardzo długie i ma więcej niż osiemdziesiąt znaków w treści', 'otwarte', '-']]);
  const it = rq.mdChanges(a, b, '01-interview/QUESTIONS.md');
  assert.deepStrictEqual(it.find(x => x.key === 'Q-001'), { type: 'entry', change: 'changed', key: 'Q-001', title: 'Czy pula się kumuluje?', fields: [{ name: 'Status', from: 'otwarte', to: 'zamknięte' }] });
  assert.deepStrictEqual(it.find(x => x.key === 'Q-002').fields, [{ name: 'Pytanie' }, { name: 'Do kogo (rola)' }]);
  assert.strictEqual(it.find(x => x.key === 'Q-002').title, 'Net-billing od kiedy?');
  const q4 = it.find(x => x.key === 'Q-004');
  assert.strictEqual(q4.change, 'added');
  assert.ok(q4.title.length <= 81 && q4.title.endsWith('…'));
  assert.strictEqual(it.find(x => x.key === 'Q-003').change, 'removed');
  assert.ok(!it.some(x => /x/.test(x.key)), 'wiersz-wzor');
  assert.strictEqual(it.length, 4);
  // slownik: klucz = pojecie
  const G = (d, s) => '| Pojecie | Definicja | Status |\n|---|---|---|\n| Cena kWh | ' + d + ' | ' + s + ' |\n';
  assert.deepStrictEqual(rq.mdChanges(G('cena zakupu', 'roboczy'), G('cena zakupu 1 kWh', 'zatwierdzony'), '02-domain/GLOSSARY.md'),
    [{ type: 'entry', change: 'changed', key: 'Cena kWh', title: 'cena zakupu 1 kWh', fields: [{ name: 'Definicja' }, { name: 'Status', from: 'roboczy', to: 'zatwierdzony' }] }]);
});

const PRD = (crit, status, extra) => '# PRD - FV\n\n## 1. Cel\nLiczyć zwrot.\n\n## 5. Wymagania\n\n' +
  '### R-001 Wpisanie odczytu miesiąca\nOpis:              Właściciel wpisuje odczyt.\nStatus:            ' + status + '\n\nKryteria akceptacji:\n' + crit + '\n\n' +
  '### R-002 Oszczędność\nOpis:  liczy\nStatus: zatwierdzone\n' + (extra || '');

test('AC-VS3: mdChanges - bloki z naglowkiem: pola wielolinijkowe, Status, nowy blok, encja i sekcja bez ID, kolejnosc', () => {
  const a = PRD('- AC-001-1: Given a, When b, Then c', 'zatwierdzone');
  const b = PRD('- AC-001-1: Given a, When b, Then c\n- AC-001-2: Given x, When y, Then z', 'do zmiany', '\n### R-003 Import CSV\nOpis: import\nStatus: robocze\n');
  const it = rq.mdChanges(a, b, '03-spec/PRD.md');
  assert.deepStrictEqual(it, [
    { type: 'entry', change: 'changed', key: 'R-001', title: 'Wpisanie odczytu miesiąca', fields: [{ name: 'Status', from: 'zatwierdzone', to: 'do zmiany' }, { name: 'Kryteria akceptacji' }] },
    { type: 'entry', change: 'added', key: 'R-003', title: 'Import CSV', fields: [] },
  ]);
  // decyzje: "## D-001 | data | tytul"; wzor D-xxx pominiety
  const D = t => '# Decyzje\n\n## D-xxx | YYYY-MM-DD | <tytul>\nPytanie:\n\n## D-001 | 2026-09-27 | Stare dokumenty\nDecyzja: ' + t + '\nZdecydowal: Tomek\n';
  assert.deepStrictEqual(rq.mdChanges(D('a'), D('b'), '01-interview/DECISIONS.md'),
    [{ type: 'entry', change: 'changed', key: 'D-001', title: 'Stare dokumenty', fields: [{ name: 'Decyzja' }] }]);
  // encja bez ID, tekst przed polami = treść; sekcja PRD bez ID
  const E = (p, s) => '# Encje\n\nwstep\n\n## Odczyt miesiąca\nPola: ' + p + '\nStany: ' + s + '\n';
  assert.deepStrictEqual(rq.mdChanges(E('okres', 'zapisany'), E('okres, faktura', 'zapisany'), '02-domain/ENTITIES.md'),
    [{ type: 'entry', change: 'changed', key: 'Odczyt miesiąca', title: '', fields: [{ name: 'Pola' }] }]);
  assert.deepStrictEqual(rq.mdChanges(a, a.replace('Liczyć zwrot.', 'Liczyć zwrot i oszczędność.'), '03-spec/PRD.md'),
    [{ type: 'entry', change: 'changed', key: '1. Cel', title: '', fields: [{ name: 'treść' }] }]);
  // zamiana kolejnosci blokow - bez zmian w tresci
  const swapped = '# PRD - FV\n\n## 1. Cel\nLiczyć zwrot.\n\n## 5. Wymagania\n\n### R-002 Oszczędność\nOpis:  liczy\nStatus: zatwierdzone\n' +
    '### R-001 Wpisanie odczytu miesiąca\nOpis:              Właściciel wpisuje odczyt.\nStatus:            zatwierdzone\n\nKryteria akceptacji:\n- AC-001-1: Given a, When b, Then c\n\n';
  assert.deepStrictEqual(rq.mdChanges(a, swapped, '03-spec/PRD.md'), []);
});

test('AC-VS3: fileChanges - grupa wg pliku, inne pliki tylko nowy / usuniety / zmieniony', () => {
  assert.strictEqual(rq.fileChanges('01-interview/board.json', board([]), board([note('n1')]), 'changed').group, 'board');
  assert.strictEqual(rq.fileChanges('01-interview/QUESTIONS.md', '', Q([['Q-001', 'a', 'otwarte', '-']]), 'added').group, 'QUESTIONS');
  assert.strictEqual(rq.fileChanges('03-spec/PRD.md', '', '', 'changed').group, 'PRD');
  assert.deepStrictEqual(rq.fileChanges('00-intake/mail.md', '', 'x', 'added'), { file: '00-intake/mail.md', group: 'other', items: [{ type: 'file', change: 'added' }] });
  assert.deepStrictEqual(rq.fileChanges('01-interview/session-2026-10-08.md', 'a', 'b', 'changed').items, [{ type: 'file', change: 'changed' }]);
});

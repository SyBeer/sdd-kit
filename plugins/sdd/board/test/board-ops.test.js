// Operacje na procesach tablicy. Kryteria z docs/specs/board-ui.md (AC-B1..AC-B5).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ops = require('../board-ops');

const sample = () => ({
  title: 'T', lanes: ['Zamowienie', 'Faktura'],
  notes: [
    { id: 'a', lane: 'Zamowienie', col: 0, text: 'x' },
    { id: 'b', lane: 'Zamowienie', col: 2, text: 'y' },
    { id: 'c', lane: 'Faktura', col: 0, text: 'z' },
  ],
});

test('AC-B1: addLane - unikalna nazwa domyslna albo podana', () => {
  const b = sample();
  assert.strictEqual(ops.addLane(b), 'Nowy proces');
  assert.strictEqual(ops.addLane(b), 'Nowy proces 2');
  assert.strictEqual(ops.addLane(b, '  Reklamacje '), 'Reklamacje');
  assert.deepStrictEqual(b.lanes, ['Zamowienie', 'Faktura', 'Nowy proces', 'Nowy proces 2', 'Reklamacje']);
  assert.throws(() => ops.addLane(b, 'Faktura'), /już jest/);
  const empty = { notes: [] };
  assert.strictEqual(ops.addLane(empty), 'Nowy proces');
  assert.deepStrictEqual(empty.lanes, ['Nowy proces']);
});

test('AC-B2: renameLane - lanes i karteczki, odrzuca pusta i zajeta', () => {
  const b = sample();
  ops.renameLane(b, 'Zamowienie', ' Zlecenie ');
  assert.deepStrictEqual(b.lanes, ['Zlecenie', 'Faktura']);
  assert.deepStrictEqual(b.notes.map(n => n.lane), ['Zlecenie', 'Zlecenie', 'Faktura']);
  assert.throws(() => ops.renameLane(b, 'Zlecenie', '  '), /pusta/);
  assert.throws(() => ops.renameLane(b, 'Zlecenie', 'Faktura'), /już jest/);
  assert.throws(() => ops.renameLane(b, 'Brak', 'X'), /nie ma/i);
  ops.renameLane(b, 'Faktura', 'Faktura'); // bez zmian - nie blad
  assert.deepStrictEqual(b.lanes, ['Zlecenie', 'Faktura']);
});

test('AC-B3: moveLane - o 1, na krawedzi bez zmian', () => {
  const b = sample();
  b.lanes.push('Trzeci');
  ops.moveLane(b, 'Faktura', -1);
  assert.deepStrictEqual(b.lanes, ['Faktura', 'Zamowienie', 'Trzeci']);
  ops.moveLane(b, 'Faktura', -1);
  assert.deepStrictEqual(b.lanes, ['Faktura', 'Zamowienie', 'Trzeci']);
  ops.moveLane(b, 'Trzeci', 1);
  assert.deepStrictEqual(b.lanes, ['Faktura', 'Zamowienie', 'Trzeci']);
  ops.moveLane(b, 'Faktura', 1);
  assert.deepStrictEqual(b.lanes, ['Zamowienie', 'Faktura', 'Trzeci']);
});

test('AC-B4: deleteLane - proces i jego karteczki', () => {
  const b = sample();
  assert.strictEqual(ops.deleteLane(b, 'Zamowienie'), 2);
  assert.deepStrictEqual(b.lanes, ['Faktura']);
  assert.deepStrictEqual(b.notes.map(n => n.id), ['c']);
  assert.strictEqual(ops.countNotes(b, 'Faktura'), 1);
});

test('AC-B5: nextCol - pierwsza kolumna za ostatnia zajeta', () => {
  const b = sample();
  assert.strictEqual(ops.nextCol(b, 'Zamowienie'), 3);
  assert.strictEqual(ops.nextCol(b, 'Faktura'), 1);
  ops.addLane(b, 'Pusty');
  assert.strictEqual(ops.nextCol(b, 'Pusty'), 0);
});

const column = (b, lane, col) => b.notes.filter(n => n.lane === lane && (n.col || 0) === col).map(n => n.id);
const stack = () => ({
  lanes: ['A', 'B'],
  notes: [
    { id: 'x', lane: 'A', col: 0 }, { id: 'p', lane: 'A', col: 1 }, { id: 'q', lane: 'A', col: 1 },
    { id: 'r', lane: 'A', col: 1 }, { id: 'y', lane: 'B', col: 0 },
  ],
});

test('AC-B8: moveNote - przed wskazana karteczka albo na koniec kolumny', () => {
  const b = stack();
  ops.moveNote(b, 'r', 'A', 1, 'p');
  assert.deepStrictEqual(column(b, 'A', 1), ['r', 'p', 'q']);
  ops.moveNote(b, 'r', 'A', 1, null);
  assert.deepStrictEqual(column(b, 'A', 1), ['p', 'q', 'r']);
  ops.moveNote(b, 'y', 'A', 1, 'q');            // z innego procesu
  assert.deepStrictEqual(column(b, 'A', 1), ['p', 'y', 'q', 'r']);
  assert.strictEqual(b.notes.find(n => n.id === 'y').lane, 'A');
  ops.moveNote(b, 'p', 'A', 0, null);           // do innej kolumny
  assert.deepStrictEqual(column(b, 'A', 0), ['x', 'p']);
  assert.deepStrictEqual(column(b, 'A', 1), ['y', 'q', 'r']);
  ops.moveNote(b, 'q', 'A', 1, 'q');            // na siebie - bez zmian
  assert.deepStrictEqual(column(b, 'A', 1), ['y', 'q', 'r']);
});

test('AC-B9: stepNote - zamiana z sasiadem w kolumnie', () => {
  const b = stack();
  ops.stepNote(b, 'r', -1);
  assert.deepStrictEqual(column(b, 'A', 1), ['p', 'r', 'q']);
  ops.stepNote(b, 'p', -1);
  assert.deepStrictEqual(column(b, 'A', 1), ['p', 'r', 'q']);
  ops.stepNote(b, 'p', 1);
  assert.deepStrictEqual(column(b, 'A', 1), ['r', 'p', 'q']);
  ops.stepNote(b, 'x', 1);                       // sam w kolumnie
  assert.deepStrictEqual(column(b, 'A', 0), ['x']);
});

test('AC-B11: stampNotes - daty utworzenia i zmiany', () => {
  const T0 = '2026-09-26T10:00:00.000Z', NOW = '2026-09-26T12:30:00.000Z';
  const prev = { lanes: ['A'], notes: [
    { id: 'a', lane: 'A', col: 0, text: 'x', type: 'ev', created: T0, updated: T0 },
    { id: 'b', lane: 'A', col: 1, text: 'y', type: 'ev', created: T0, updated: T0 },
    { id: 'c', lane: 'A', col: 2, text: 'z', type: 'ev' },
  ] };
  const next = JSON.parse(JSON.stringify(prev));
  next.notes[1].text = 'y2';                                  // zmieniona tresc
  next.notes[2].col = 3;                                      // stara bez dat, przesunieta
  next.notes.push({ id: 'd', lane: 'A', col: 4, text: 'nowa', type: 'hot' });
  next.notes.push({ id: 'e', lane: 'A', col: 5, text: 'od agenta', created: T0, updated: T0 });
  ops.stampNotes(prev, next, NOW);
  const by = id => next.notes.find(n => n.id === id);
  assert.deepStrictEqual([by('a').created, by('a').updated], [T0, T0]);
  assert.deepStrictEqual([by('b').created, by('b').updated], [T0, NOW]);
  assert.deepStrictEqual([by('c').created, by('c').updated], [undefined, NOW]);
  assert.deepStrictEqual([by('d').created, by('d').updated], [NOW, NOW]);
  assert.deepStrictEqual([by('e').created, by('e').updated], [T0, T0]);
  // zmiana, w ktorej klient sam podbil updated - zostaje jego wartosc
  const n2 = JSON.parse(JSON.stringify(next));
  n2.notes[0].type = 'hot'; n2.notes[0].updated = '2026-09-26T12:00:00.000Z';
  ops.stampNotes(next, n2, NOW);
  assert.strictEqual(n2.notes[0].updated, '2026-09-26T12:00:00.000Z');
});

test('AC-B12: fmtDate - RRRR-MM-DD HH:MM czas lokalny', () => {
  const d = new Date(2026, 8, 6, 7, 5);                       // 6 wrzesnia 2026, 07:05 lokalnie
  assert.strictEqual(ops.fmtDate(d.toISOString()), '2026-09-06 07:05');
  assert.strictEqual(ops.fmtDate(''), '');
  assert.strictEqual(ops.fmtDate(undefined), '');
  assert.strictEqual(ops.fmtDate('bzdura'), '');
});

test('AC-B14: syncState - stan synchronizacji karteczki', () => {
  const S = '2026-09-26T12:00:00Z';
  assert.strictEqual(ops.syncState({ ref: 'Q-1' }, null), 'board');
  assert.strictEqual(ops.syncState({ synced: S, updated: '2026-09-26T13:00:00Z' }, true), 'changed');
  assert.strictEqual(ops.syncState({ synced: S, updated: '2026-09-26T11:00:00Z' }, false), 'missing');
  assert.strictEqual(ops.syncState({ synced: S, updated: S }, true), 'synced');
  assert.strictEqual(ops.syncState({ synced: S }, null), 'synced');
  // strefy czasowe porownywane jako czas, nie tekst
  assert.strictEqual(ops.syncState({ synced: '2026-09-26T14:00:00+02:00', updated: '2026-09-26T12:30:00Z' }, true), 'changed');
});

test('AC-B15: syncMap - ref w pliku jako cale slowo, plik czytany raz', () => {
  const reads = [];
  const files = { '01-interview/QUESTIONS.md': '| Q-024 | pytanie |\n| Q-1000 | x |', '02-domain/ACTORS.md': 'Spedytor' };
  const read = f => { reads.push(f); return f in files ? files[f] : null; };
  const S = '2026-09-26T12:00:00Z';
  const b = { notes: [
    { id: 'a', ref: 'Q-024', file: '01-interview/QUESTIONS.md', synced: S },
    { id: 'b', ref: 'Q-02', file: '01-interview/QUESTIONS.md', synced: S },
    { id: 'c', ref: 'Q-100', file: '01-interview/QUESTIONS.md', synced: S },
    { id: 'd', ref: 'BR-01', file: '02-domain/RULES.md', synced: S },
    { id: 'e', file: '02-domain/ACTORS.md', synced: S },
    { id: 'f', ref: 'Q-024' },
  ] };
  assert.deepStrictEqual(ops.syncMap(b, read), { a: 'synced', b: 'missing', c: 'missing', d: 'missing', e: 'synced', f: 'board' });
  assert.strictEqual(reads.filter(f => f === '01-interview/QUESTIONS.md').length, 1);
});

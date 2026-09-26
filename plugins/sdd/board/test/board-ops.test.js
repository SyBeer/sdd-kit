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

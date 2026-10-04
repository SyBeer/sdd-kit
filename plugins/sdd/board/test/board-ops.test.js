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
  next.notes[2].col = 0; next.notes[2]._moved = true;         // stara bez dat, przeniesiona w przegladarce (AC-B28)
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

test('AC-B17: boardHint - jaka wskazowke pokazac', () => {
  assert.strictEqual(ops.boardHint({ lanes: [], notes: [] }), 'blank');
  assert.strictEqual(ops.boardHint({}), 'blank');
  assert.strictEqual(ops.boardHint({ lanes: ['A'], notes: [] }), 'nonotes');
  assert.strictEqual(ops.boardHint({ lanes: ['A'] }), 'nonotes');
  assert.strictEqual(ops.boardHint({ lanes: ['A'], notes: [{ id: 'a', lane: 'A' }] }), null);
  assert.strictEqual(ops.boardHint({ lanes: [], notes: [{ id: 'a', lane: 'X' }] }), null);
});

test('AC-B27: insertCol - przesuwa dalsze kolumny procesu', () => {
  const b = { lanes: ['A', 'B'], notes: [
    { id: 'a', lane: 'A', col: 0 }, { id: 'b', lane: 'A', col: 1 }, { id: 'c', lane: 'A', col: 1 },
    { id: 'd', lane: 'A', col: 3 }, { id: 'e', lane: 'B', col: 1 },
  ] };
  assert.strictEqual(ops.insertCol(b, 'A', 1), 3);
  assert.deepStrictEqual(b.notes.map(n => n.col), [0, 2, 2, 4, 1]);
  assert.strictEqual(ops.insertCol(b, 'A', 9), 0);
});

test('AC-B28: stampNotes - numer kolumny bez zmiany miejsca nie jest zmiana', () => {
  const T0 = '2026-09-26T10:00:00.000Z', NOW = '2026-09-27T12:00:00.000Z';
  const base = () => ({ lanes: ['A', 'B'], notes: [
    { id: 'a', lane: 'A', col: 0, text: 'a', created: T0, updated: T0 },
    { id: 'b', lane: 'A', col: 1, text: 'b', created: T0, updated: T0 },
    { id: 'c', lane: 'A', col: 2, text: 'c', created: T0, updated: T0 },
    { id: 'e', lane: 'B', col: 0, text: 'e', created: T0, updated: T0 },
  ] });
  const by = (b, id) => b.notes.find(n => n.id === id);
  // wstawienie kolumny 1 z nowa karteczka
  const prev = base(), next = base();
  ops.insertCol(next, 'A', 1);
  next.notes.push({ id: 'n', lane: 'A', col: 1, text: 'nowa' });
  ops.stampNotes(prev, next, NOW);
  assert.deepStrictEqual(['a', 'b', 'c', 'e'].map(id => by(next, id).updated), [T0, T0, T0, T0]);
  assert.strictEqual(by(next, 'n').updated, NOW);
  // cofniecie wstawienia: karteczka znika, kolumny wracaja
  const back = base();
  ops.stampNotes(next, back, NOW);
  assert.deepStrictEqual(['a', 'b', 'c'].map(id => by(back, id).updated), [T0, T0, T0]);
  // przeniesienie a za b (placeNote na nowa kolumne) - stempel tylko dla a, nie dla b, ktora a minela
  const moved = base();
  ops.placeNote(moved, 'a', 'A', 2, { newCol: true });
  assert.strictEqual(by(moved, 'a')._moved, true);
  ops.stampNotes(base(), moved, NOW);
  assert.strictEqual(by(moved, 'a').updated, NOW);
  assert.strictEqual('_moved' in by(moved, 'a'), false, '_moved nie trafia do pliku');
  assert.deepStrictEqual(['b', 'c'].map(id => by(moved, id).updated), [T0, T0]);
  // cofniecie przeniesienia: a wraca z dawna data, b i c bez stempla
  const undo = base();
  ops.stampNotes(moved, undo, NOW);
  assert.deepStrictEqual(['a', 'b', 'c'].map(id => by(undo, id).updated), [T0, T0, T0]);
});

test('AC-B39: stampNotes - zmiana nazwy procesu nie jest zmiana karteczek', () => {
  const T0 = '2026-09-26T10:00:00.000Z', NOW = '2026-09-27T12:00:00.000Z';
  const base = () => ({ lanes: ['A', 'B'], notes: [
    { id: 'a', lane: 'A', col: 0, text: 'a', created: T0, updated: T0 },
    { id: 'b', lane: 'A', col: 1, text: 'b', created: T0, updated: T0 },
    { id: 'e', lane: 'B', col: 0, text: 'e', created: T0, updated: T0 },
  ] });
  const by = (b, id) => b.notes.find(n => n.id === id);
  // zmiana nazwy A -> A2: karteczki bez stempla
  const renamed = base();
  ops.renameLane(renamed, 'A', 'A2');
  ops.stampNotes(base(), renamed, NOW);
  assert.deepStrictEqual(['a', 'b', 'e'].map(id => by(renamed, id).updated), [T0, T0, T0]);
  // cofniecie zmiany nazwy
  const back = base();
  ops.stampNotes(renamed, back, NOW);
  assert.deepStrictEqual(['a', 'b'].map(id => by(back, id).updated), [T0, T0]);
  // zmiana nazwy i w tym samym zapisie przeniesienie b formularzem do B - stempel tylko dla b
  const both = base();
  ops.renameLane(both, 'A', 'A2');
  by(both, 'b').lane = 'B';
  ops.stampNotes(base(), both, NOW);
  assert.deepStrictEqual([by(both, 'a').updated, by(both, 'b').updated], [T0, NOW]);
  // przeniesienie formularzem do innego istniejacego procesu (bez _moved) - dalej zmiana
  const form = base();
  by(form, 'a').lane = 'B';
  ops.stampNotes(base(), form, NOW);
  assert.strictEqual(by(form, 'a').updated, NOW);
});

test('AC-B30: closeCol - zamyka tylko pusta kolumne procesu', () => {
  const b = { lanes: ['A', 'B'], notes: [
    { id: 'a', lane: 'A', col: 0 }, { id: 'c', lane: 'A', col: 2 }, { id: 'd', lane: 'A', col: 3 }, { id: 'e', lane: 'B', col: 3 },
  ] };
  assert.strictEqual(ops.closeCol(b, 'A', 0), 0, 'kolumna zajeta - nic');
  assert.strictEqual(ops.closeCol(b, 'A', 1), 2);
  assert.deepStrictEqual(b.notes.map(n => n.col), [0, 1, 2, 3]);
});

test('AC-B31: placeNote i removeNote - bez dziur po przeniesieniu', () => {
  const mk = () => ({ lanes: ['A', 'B'], notes: [
    { id: 'a', lane: 'A', col: 0 }, { id: 'b', lane: 'A', col: 1 }, { id: 'c', lane: 'A', col: 2 },
    { id: 'x', lane: 'B', col: 0 }, { id: 'y', lane: 'B', col: 1 },
  ] });
  const cols = (b, lane) => b.notes.filter(n => n.lane === lane).map(n => n.id + n.col).join(' ');
  // b miedzy x i y w procesie B (nowa kolumna 1)
  let b = mk(); ops.placeNote(b, 'b', 'B', 1, { newCol: true });
  assert.strictEqual(cols(b, 'A'), 'a0 c1');
  assert.strictEqual(cols(b, 'B'), 'x0 y2 b1');
  // c miedzy a i b w tym samym procesie
  b = mk(); ops.placeNote(b, 'c', 'A', 1, { newCol: true });
  assert.strictEqual(cols(b, 'A'), 'a0 b2 c1');
  // a do kolumny c (zwykla kolumna) - kolumna 0 znika
  b = mk(); ops.placeNote(b, 'a', 'A', 2, {});
  assert.strictEqual(cols(b, 'A'), 'b0 c1 a1');
  // przed konkretna karteczka
  b = mk(); ops.placeNote(b, 'y', 'A', 1, { before: 'b' });
  assert.deepStrictEqual(b.notes.filter(n => n.lane === 'A' && n.col === 1).map(n => n.id), ['y', 'b']);
  // usuniecie jedynej karteczki w kolumnie
  b = mk(); ops.removeNote(b, 'b');
  assert.strictEqual(cols(b, 'A'), 'a0 c1');
});

test('AC-B33: odstep (space) ma wlasny stan synchronizacji', () => {
  assert.strictEqual(ops.syncState({ type: 'space' }, null), 'space');
  assert.strictEqual(ops.syncState({ type: 'space', synced: '2026-09-27T10:00:00Z', ref: 'R-1' }, false), 'space');
  const b = { notes: [{ id: 's', type: 'space', synced: '2026-09-27T10:00:00Z', ref: 'R-1', file: 'x.md' }] };
  assert.deepStrictEqual(ops.syncMap(b, () => null), { s: 'space' });
});

test('AC-B35: noteSync - stan do narysowania zawsze znany', () => {
  assert.strictEqual(ops.noteSync({ id: 's', type: 'space' }, { s: 'synced' }), 'space');
  assert.strictEqual(ops.noteSync({ id: 'a', type: 'ev' }, { a: 'space' }), 'board', 'odstep zmieniony na zdarzenie, serwer jeszcze nie przeliczyl');
  assert.strictEqual(ops.noteSync({ id: 'a', type: 'ev' }, { a: 'cos-nowego' }), 'board');
  assert.strictEqual(ops.noteSync({ id: 'a', type: 'ev' }, undefined), 'board');
  for (const st of ['synced', 'changed', 'missing', 'board']) assert.strictEqual(ops.noteSync({ id: 'a', type: 'ev' }, { a: st }), st);
});

test('AC-B37: boardSwitched - wykrywa tablice z innego pliku', () => {
  assert.strictEqual(ops.boardSwitched(null, { _file: '/a/board.json' }), null);
  assert.strictEqual(ops.boardSwitched('/a/board.json', { _file: '/a/board.json' }), null);
  assert.deepStrictEqual(ops.boardSwitched('/a/board.json', { _file: '/x/example.json' }), { from: '/a/board.json', to: '/x/example.json' });
  assert.strictEqual(ops.boardSwitched('/a/board.json', {}), null, 'stary serwer bez _file - nie ostrzegaj na slepo');
});

test('AC-B50: copyNote - kopia pod oryginalem albo we wskazanym miejscu, bez ref i synchronizacji', () => {
  const NOW = '2026-10-03T12:00:00.000Z';
  const mk = () => ({ lanes: ['A', 'B'], notes: [
    { id: 'a', lane: 'A', col: 0, type: 'pol', text: 'Regula', ref: 'BR-001', source: '[Biz] warsztat', by: 'agent',
      file: '02-domain/RULES.md', synced: 'x', created: 't0', updated: 't0' },
    { id: 'b', lane: 'A', col: 0, type: 'ev', text: 'Zdarzenie' },
    { id: 'c', lane: 'A', col: 1, type: 'cmd', text: 'Komenda' },
    { id: 'h', lane: 'B', col: 0, type: 'hot', text: 'Pytanie', ref: 'Q-001', answer: 'tak', answeredBy: 'sponsor', answeredAt: 't1' },
  ] });
  let b = mk();
  const id = ops.copyNote(b, 'a', NOW);
  const k = b.notes.find(n => n.id === id);
  assert.notStrictEqual(id, 'a');
  assert.deepStrictEqual(b.notes.filter(n => n.lane === 'A' && n.col === 0).map(n => n.id), ['a', id, 'b'], 'zaraz pod oryginalem');
  assert.deepStrictEqual([k.text, k.type, k.lane, k.col, k.by, k.source, k.created, k.updated], ['Regula', 'pol', 'A', 0, 'człowiek', '[Biz] warsztat (kopia)', NOW, NOW]);
  for (const f of ['ref', 'synced', 'file']) assert.strictEqual(f in k, false, f);
  assert.strictEqual(b.notes.find(n => n.id === 'a').ref, 'BR-001', 'oryginal bez zmian');
  // w inne miejsce: inny proces, przed karteczka
  b = mk();
  const id2 = ops.copyNote(b, 'c', NOW, { lane: 'B', col: 0, before: 'h' });
  assert.deepStrictEqual(b.notes.filter(n => n.lane === 'B' && n.col === 0).map(n => n.id), [id2, 'h']);
  assert.strictEqual(b.notes.find(n => n.id === 'c').lane, 'A', 'oryginal zostaje');
  // nowa kolumna
  b = mk();
  const id3 = ops.copyNote(b, 'b', NOW, { lane: 'A', col: 1, newCol: true });
  assert.strictEqual(b.notes.find(n => n.id === id3).col, 1);
  assert.strictEqual(b.notes.find(n => n.id === 'c').col, 2);
  // pytanie: bez odpowiedzi i numeru
  b = mk();
  const qid = ops.copyNote(b, 'h', NOW);
  const q = b.notes.find(n => n.id === qid);
  for (const f of ['ref', 'answer', 'answeredBy', 'answeredAt']) assert.strictEqual(f in q, false, f);
  assert.strictEqual(q.source, '(kopia)');
  // unikalne id przy wielu kopiach naraz
  b = mk();
  const ids = [ops.copyNote(b, 'a', NOW), ops.copyNote(b, 'a', NOW), ops.copyNote(b, 'a', NOW)];
  assert.strictEqual(new Set(b.notes.map(n => n.id)).size, b.notes.length);
  assert.strictEqual(ids.length, 3);
  assert.strictEqual(ops.copyNote(b, 'nie-ma', NOW), null);
});

// ---- Zmiana 0.28.1: stan "w plikach" po /sdd:board processes (AC-B52, AC-B53)
test('AC-B52: skill board processes - synced i file tylko dla elementow juz w plikach', () => {
  const fs = require('fs'), path = require('path');
  const sk = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'board', 'SKILL.md'), 'utf8');
  const sec = sk.split('## Procesy z dzialajacej aplikacji')[1].split('\n## ')[0];
  assert.match(sec, /juz w plikach[\s\S]{0,400}?`synced` = teraz/);
  assert.match(sec, /bez `synced` i bez `file`/);
  assert.doesNotMatch(sec, /docelowy plik/);
  assert.match(sec, /w plikach.*tylko na tablicy/);
});

test('AC-B53: syncMap po processes - element z plikow synced, karteczka z kodu board, nowe Q z synced byloby missing', () => {
  const now = '2026-10-04T10:00:00+02:00';
  const files = {
    '02-domain/RULES.md': '| BR-004 | Jezeli cena paliwa pusta, to blad | [Biz] |',
    '02-domain/ACTORS.md': '| Kierowca | wpisuje odczyt |',
    '01-interview/QUESTIONS.md': '| Q-007 | Kto? | otwarte |',
  };
  const b = { lanes: ['Odczyt'], notes: [
    { id: 'br', lane: 'Odczyt', col: 2, type: 'pol', text: 'Jezeli cena pusta, to blad', ref: 'BR-004', file: '02-domain/RULES.md', synced: now, created: now, updated: now },
    { id: 'act', lane: 'Odczyt', col: 0, type: 'act', text: 'Kierowca', file: '02-domain/ACTORS.md', synced: now, created: now, updated: now },
    { id: 'app', lane: 'Odczyt', col: 1, type: 'cmd', text: 'Wpisz odczyt licznika', source: '[App] src/main.py:120', created: now, updated: now },
    { id: 'qnew', lane: 'Odczyt', col: 1, type: 'hot', text: 'Kiedy ostatnio?', ref: 'Q-012', created: now, updated: now },
    { id: 'qbad', lane: 'Odczyt', col: 1, type: 'hot', text: 'Kiedy ostatnio?', ref: 'Q-012', file: '01-interview/QUESTIONS.md', synced: now, created: now, updated: now },
  ] };
  const m = ops.syncMap(b, f => (f in files ? files[f] : null));
  assert.strictEqual(m.br, 'synced');
  assert.strictEqual(m.act, 'synced');
  assert.strictEqual(m.app, 'board');
  assert.strictEqual(m.qnew, 'board');
  assert.strictEqual(m.qbad, 'missing');
});

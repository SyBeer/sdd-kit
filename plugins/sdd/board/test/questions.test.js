// Pytania z pliku na tablicy. Kryteria z docs/specs/board-ui.md, punkt 18 (AC-B40..AC-B43).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ops = require('../board-ops');
const { questionIndex } = require('../progress');

const TEMPLATES = path.join(__dirname, '..', '..', 'templates', 'requirements');
function project(rows) {
  const req = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-q-')), 'requirements');
  fs.cpSync(TEMPLATES, req, { recursive: true });
  fs.appendFileSync(path.join(req, '01-interview', 'QUESTIONS.md'), rows.join('\n') + '\n');
  return req;
}

test('AC-B40: questionIndex - pytania z pliku z rodzajem i powiazanymi ID', () => {
  const req = project([
    '| Q-001 | Jakie maile dostal klient? | otwarte | wlasciciel procesu | zalozenie bez biznesu: A-014 (BR-030) | A-014 | |',
    '| Q-002 | Dlaczego szablony sa prywatne? | zadane (runda 2, 2026-10-10) | sponsor | pusty powod: D-027 | D-027, R-005 | |',
    '| Q-003 | Format numeru? | odpowiedziane | wlasciciel procesu | Q-001 | R-001 | D-036 |',
    '| Q-004 | Kopia? | zaparkowane (po go-live) | sponsor | mail | | |',
  ]);
  const q = questionIndex(req);
  assert.deepStrictEqual(Object.keys(q), ['Q-001', 'Q-002', 'Q-003', 'Q-004']);
  assert.strictEqual(q['Q-001'].text, 'Jakie maile dostal klient?');
  assert.strictEqual(q['Q-001'].kind, 'open');
  assert.deepStrictEqual(q['Q-001'].refs, ['A-014', 'BR-030']);
  assert.strictEqual(q['Q-002'].kind, 'asked');
  assert.deepStrictEqual(q['Q-002'].refs, ['D-027', 'R-005']);
  assert.strictEqual(q['Q-003'].kind, 'answered');
  assert.strictEqual(q['Q-003'].closedBy, 'D-036');
  assert.deepStrictEqual(q['Q-003'].refs, ['R-001'], 'bez odwolan do innych pytan');
  assert.strictEqual(q['Q-004'].kind, 'parked');
});

test('AC-B40b: questionIndex - posrednie ID: decyzja -> Wplyw, zalozenie -> wymagania i reguly', () => {
  const req = project([
    '| Q-010 | Dlaczego jeden przycisk? | otwarte | sponsor | pusty powod: D-036 | D-036 | |',
    '| Q-011 | Czy klient ma NIP? | otwarte | sponsor | zalozenie bez biznesu: A-002 | A-002 | |',
  ]);
  fs.appendFileSync(path.join(req, '01-interview', 'DECISIONS.md'),
    '\n## D-036 | 2026-09-27 | Jeden przycisk\nDecyzja: x\nPowod:\nWplyw: zmienia D-028; BR-026; R-010 (AC-010-1)\n');
  fs.appendFileSync(path.join(req, '01-interview', 'ASSUMPTIONS.md'), '| A-002 | Klient ma NIP | niepotwierdzone | [AI] | R-002 |\n');
  fs.appendFileSync(path.join(req, '02-domain', 'RULES.md'), '| BR-007 | Jezeli brak NIP, to blad | [Dok] | A-002 | R-002 | robocze |\n');
  const q = questionIndex(req);
  assert.deepStrictEqual(q['Q-010'].refs, ['D-036', 'D-028', 'BR-026', 'R-010'], 'najpierw bezposrednie, potem z Wplywu decyzji');
  assert.deepStrictEqual(q['Q-011'].refs, ['A-002', 'R-002', 'BR-007']);
});

test('AC-B40c: questionIndex - wstecz: R w PRD i BR w RULES, ktore cytuja decyzje', () => {
  const req = project(['| Q-012 | Dlaczego tylko TL anuluje? | otwarte | sponsor | pusty powod: D-021 | D-021 | |']);
  fs.appendFileSync(path.join(req, '01-interview', 'DECISIONS.md'),
    '\n## D-021 | 2026-09-26 | Anulacja\nDecyzja: x\nPowod:\nWplyw: ENTITIES Zlecenie; brak R w PRD\n');
  fs.appendFileSync(path.join(req, '02-domain', 'RULES.md'), '| BR-019 | Jezeli anulacja, to TL | [Biz] session, Q-020 (D-021) | | R-004 | robocze |\n');
  fs.appendFileSync(path.join(req, '03-spec', 'PRD.md'), '\n### R-004 Anulacja\nZrodlo:            [Biz] session (D-021)\nStatus:            robocze\n');
  assert.deepStrictEqual(questionIndex(req)['Q-012'].refs, ['D-021', 'BR-019', 'R-004']);
});

const Q = {
  'Q-001': { text: 'Maile?', kind: 'open', refs: ['A-014', 'BR-030'] },
  'Q-002': { text: 'Szablony prywatne?', kind: 'asked', refs: ['D-027', 'R-005'] },
  'Q-003': { text: 'Format?', kind: 'answered', closedBy: 'D-036', refs: ['R-001'] },
  'Q-004': { text: 'Kopia?', kind: 'parked', refs: [] },
  'Q-005': { text: 'Sprzeczne?', kind: 'conflicting', refs: ['BR-001'] },
  'Q-006': { text: 'Na tablicy', kind: 'open', refs: [] },
};
const board = () => ({ lanes: ['Tworzenie', 'Szablony'], notes: [
  { id: 'a', lane: 'Tworzenie', col: 0, type: 'pol', ref: 'BR-001' },
  { id: 'b', lane: 'Tworzenie', col: 1, type: 'ev' },
  { id: 'c', lane: 'Szablony', col: 2, type: 'cmd', ref: 'R-005' },
  { id: 'd', lane: 'Szablony', col: 2, type: 'pol', ref: 'BR-034' },
  { id: 'e', lane: 'Szablony', col: 3, type: 'hot', ref: 'Q-006' },
] });

test('AC-B41: missingQuestions - otwarte, zadane, sprzeczne spoza tablicy', () => {
  assert.deepStrictEqual(ops.missingQuestions(board(), Q).map(q => q.id), ['Q-001', 'Q-002', 'Q-005']);
  assert.deepStrictEqual(ops.missingQuestions(board(), undefined), []);
});

test('AC-B42: placeQuestions - przy karteczce z ref albo w procesie Do wyjasnienia', () => {
  const b = board(), NOW = '2026-09-27T12:00:00.000Z';
  const n = ops.placeQuestions(b, ops.missingQuestions(b, Q), NOW);
  assert.strictEqual(n, 3);
  const by = ref => b.notes.find(x => x.ref === ref);
  assert.deepStrictEqual([by('Q-002').lane, by('Q-002').col], ['Szablony', 2]);
  const col2 = b.notes.filter(x => x.lane === 'Szablony' && x.col === 2).map(x => x.id);
  assert.strictEqual(col2[col2.length - 1], by('Q-002').id, 'na koncu kolumny');
  assert.deepStrictEqual([by('Q-005').lane, by('Q-005').col], ['Tworzenie', 0]);
  assert.strictEqual(by('Q-001').lane, 'Do wyjaśnienia');
  assert.deepStrictEqual(b.lanes, ['Tworzenie', 'Szablony', 'Do wyjaśnienia']);
  const q = by('Q-002');
  assert.strictEqual(q.type, 'hot'); assert.strictEqual(q.text, 'Szablony prywatne?');
  assert.strictEqual(q.file, '01-interview/QUESTIONS.md'); assert.strictEqual(q.by, 'agent');
  assert.deepStrictEqual([q.synced, q.created, q.updated], [NOW, NOW, NOW]);
  // drugi raz - nic do dolozenia; kolejne pytania bez miejsca w nastepnych kolumnach
  assert.strictEqual(ops.placeQuestions(b, ops.missingQuestions(b, Q), NOW), 0);
  const b2 = board();
  ops.placeQuestions(b2, [{ id: 'Q-010', text: 'x', refs: [] }, { id: 'Q-011', text: 'y', refs: ['R-999'] }], NOW);
  assert.deepStrictEqual(b2.notes.filter(x => x.lane === 'Do wyjaśnienia').map(x => x.col), [0, 1]);
  assert.strictEqual(new Set(b2.notes.map(x => x.id)).size, b2.notes.length, 'unikalne id');
});

test('AC-B43: closedQuestion i isQuestionsLane', () => {
  assert.strictEqual(ops.closedQuestion({ type: 'hot', ref: 'Q-003' }, Q), 'zamknięte: D-036');
  assert.strictEqual(ops.closedQuestion({ type: 'hot', ref: 'Q-004' }, Q), 'zaparkowane');
  assert.strictEqual(ops.closedQuestion({ type: 'hot', ref: 'Q-001' }, Q), null);
  assert.strictEqual(ops.closedQuestion({ type: 'pol', ref: 'BR-001' }, Q), null);
  assert.strictEqual(ops.closedQuestion({ type: 'hot', ref: 'Q-003' }, undefined), null);
  const noClose = { 'Q-007': { kind: 'answered', closedBy: '' } };
  assert.strictEqual(ops.closedQuestion({ type: 'hot', ref: 'Q-007' }, noClose), 'zamknięte');
  for (const n of ['Do wyjaśnienia', 'do wyjasnienia', 'DO WYJAŚNIENIA ']) assert.strictEqual(ops.isQuestionsLane(n), true, n);
  assert.strictEqual(ops.isQuestionsLane('Wyjasnienie kopii'), false);
});

// ---- punkt 19: odpowiedzi na tablicy (AC-B45..AC-B48)
test('AC-B45: questionIndex - rola i blokujace', () => {
  const req = project([
    '| Q-020 | Kto zatwierdza? | otwarte | wlasciciel procesu | mail, blokuje go-live | | |',
    '| Q-021 | Termin? | otwarte | sponsor | mail, nie blokuje go-live | | |',
  ]);
  const q = questionIndex(req);
  assert.strictEqual(q['Q-020'].role, 'wlasciciel procesu');
  assert.strictEqual(q['Q-020'].blocking, true);
  assert.strictEqual(q['Q-021'].blocking, false);
});

test('AC-B46: stampNotes - zmiana odpowiedzi to zmiana karteczki', () => {
  const T0 = '2026-09-26T10:00:00.000Z', NOW = '2026-09-27T12:00:00.000Z';
  const prev = { notes: [{ id: 'h', type: 'hot', ref: 'Q-1', text: 'x', created: T0, updated: T0 }, { id: 'g', type: 'hot', text: 'y', answer: 'a', created: T0, updated: T0 }] };
  const next = JSON.parse(JSON.stringify(prev));
  next.notes[0].answer = '14 dni'; next.notes[0].answeredBy = 'sponsor';
  next.notes[1].answeredBy = 'sponsor';
  ops.stampNotes(prev, next, NOW);
  assert.strictEqual(next.notes[0].updated, NOW);
  assert.strictEqual(next.notes[1].updated, NOW);
});

const QS = {
  'Q-001': { kind: 'open', refs: [] }, 'Q-002': { kind: 'asked', refs: [] }, 'Q-003': { kind: 'conflicting', refs: [] },
  'Q-004': { kind: 'open', blocking: true, refs: [] }, 'Q-005': { kind: 'answered', closedBy: 'D-1', refs: [] },
  'Q-010': { kind: 'open', refs: [] },
};
test('AC-B47: answerState i pendingAnswers', () => {
  assert.strictEqual(ops.answerState({ type: 'hot', ref: 'Q-001', answer: '14 dni' }, QS), 'pending');
  assert.strictEqual(ops.answerState({ type: 'hot', answer: 'nowe z warsztatu' }, QS), 'pending', 'pytanie spoza pliku');
  assert.strictEqual(ops.answerState({ type: 'hot', ref: 'Q-005', answer: 'x' }, QS), 'recorded');
  assert.strictEqual(ops.answerState({ type: 'hot', ref: 'Q-001', answer: '  ' }, QS), null);
  assert.strictEqual(ops.answerState({ type: 'hot', ref: 'Q-001' }, QS), null);
  assert.strictEqual(ops.answerState({ type: 'pol', answer: 'x' }, QS), null);
  const b = { notes: [{ id: 'a', type: 'hot', ref: 'Q-001', answer: 'x' }, { id: 'b', type: 'hot', ref: 'Q-005', answer: 'y' }, { id: 'c', type: 'hot', ref: 'Q-002' }] };
  assert.deepStrictEqual(ops.pendingAnswers(b, QS).map(n => n.id), ['a']);
});

test('AC-B48: questionOrder - priorytet przegladu', () => {
  const b = { notes: [
    { id: 'o10', type: 'hot', ref: 'Q-010' }, { id: 'o1', type: 'hot', ref: 'Q-001' }, { id: 'as', type: 'hot', ref: 'Q-002' },
    { id: 'cf', type: 'hot', ref: 'Q-003' }, { id: 'bl', type: 'hot', ref: 'Q-004' }, { id: 'cl', type: 'hot', ref: 'Q-005' },
    { id: 'new', type: 'hot', text: 'z warsztatu' }, { id: 'ans', type: 'hot', ref: 'Q-001x', answer: 'jest' },
    { id: 'ev', type: 'ev', ref: 'R-001' },
  ] };
  assert.deepStrictEqual(ops.questionOrder(b, QS), ['cf', 'bl', 'as', 'o1', 'o10', 'new', 'ans', 'cl']);
});

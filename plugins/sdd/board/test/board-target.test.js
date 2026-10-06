// Procesy docelowe na Tablicy, widok dzis / docelowo / oba. Kryteria z docs/specs/board-target.md (AC-BT1..AC-BT8, 0.36.0).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ops = require('../board-ops.js');
const info = require('../info.js');

const B = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(B, 'index.html'), 'utf8');
const skill = fs.readFileSync(path.join(B, '..', 'skills', 'board', 'SKILL.md'), 'utf8');

const board = () => ({ lanes: ['Dzis', 'Nowy', 'Mieszany', 'Pusty'], notes: [
  { id: 'a', type: 'cmd', text: 'x', lane: 'Dzis', col: 0 },
  { id: 'b', type: 'cmd', text: 'y', lane: 'Nowy', col: 0, target: true },
  { id: 'c', type: 'space', text: '', lane: 'Nowy', col: 1 },
  { id: 'd', type: 'ev', text: 'z', lane: 'Nowy', col: 2, target: true },
  { id: 'e', type: 'act', text: 'k', lane: 'Mieszany', col: 0 },
  { id: 'f', type: 'pol', text: 'r', lane: 'Mieszany', col: 1, target: true },
  { id: 'g', type: 'space', text: '', lane: 'Pusty', col: 0, target: true },
] });

test('AC-BT1: isTarget, targetLane, countTarget, VIEWS, viewOf', () => {
  const b = board();
  assert.strictEqual(ops.isTarget(b.notes[1]), true);
  assert.strictEqual(ops.isTarget(b.notes[0]), false);
  assert.strictEqual(ops.isTarget({ target: 'true' }), false);
  assert.strictEqual(ops.targetLane(b, 'Nowy'), true);
  assert.strictEqual(ops.targetLane(b, 'Dzis'), false);
  assert.strictEqual(ops.targetLane(b, 'Mieszany'), false);
  assert.strictEqual(ops.targetLane(b, 'Pusty'), false, 'same odstepy - nie proces docelowy');
  assert.strictEqual(ops.countTarget(b), 3);
  assert.deepStrictEqual(ops.VIEWS, ['dzis', 'docelowo', 'oba']);
  assert.strictEqual(ops.viewOf('dzis'), 'dzis');
  assert.strictEqual(ops.viewOf('docelowo'), 'docelowo');
  assert.strictEqual(ops.viewOf(null), 'oba');
  assert.strictEqual(ops.viewOf('cokolwiek'), 'oba');
});

test('AC-BT2: kopia docelowej jest docelowa; zmiana target aktualizuje updated', () => {
  const b = board();
  const id = ops.copyNote(b, 'b', '2026-10-06T21:00:00+02:00');
  assert.strictEqual(b.notes.find(n => n.id === id).target, true);
  const id2 = ops.copyNote(b, 'a', '2026-10-06T21:00:00+02:00');
  assert.strictEqual(b.notes.find(n => n.id === id2).target, undefined);
  const prev = { lanes: ['L'], notes: [{ id: 'n', type: 'cmd', text: 't', lane: 'L', col: 0, updated: 'U0', created: 'C0' }] };
  const next = JSON.parse(JSON.stringify(prev)); next.notes[0].target = true;
  ops.stampNotes(prev, next, 'NOW');
  assert.strictEqual(next.notes[0].updated, 'NOW');
});

test('AC-BT3: karteczka i proces docelowy - klasa target, etykieta DOCELOWO, CSS', () => {
  assert.match(html, /if\(ops\.isTarget\(n\)\)\{ el\.classList\.add\('target'\)/);
  assert.match(html, /tg\.className='tgt'; tg\.textContent='DOCELOWO'/);
  assert.match(html, /if\(ops\.targetLane\(board,lane\)\)\{ L\.classList\.add\('target'\)/);
  assert.match(html, /lt\.className='ltag'; lt\.textContent='DOCELOWO'/);
  assert.match(html, /\.note\.target\{[^}]*border:1\.5px dashed/);
  assert.match(html, /\.lane\.target\{[^}]*repeating-linear-gradient/);
});

test('AC-BT4: przelacznik widoku - #view, klasy na body, zapis, ukryty bez docelowych, CSS widokow', () => {
  assert.match(html, /<span class="vseg" id="view" role="group" aria-label="Widok tablicy"[^>]*>/);
  ['data-view="dzis"', 'data-view="docelowo"', 'data-view="oba"'].forEach(t => assert.ok(html.includes(t), t));
  assert.match(html, /localStorage\.setItem\('sdd-board-view'/);
  assert.match(html, /ops\.viewOf\(/);
  assert.match(html, /\$\('#view'\)\.hidden=!nt/);
  assert.match(html, /body\.v-dzis \.note\.target,body\.v-dzis \.lane\.target\{display:none\}/);
  assert.match(html, /body\.v-docelowo \.note:not\(\.target\)\{opacity:\.35\}/);
});

test('AC-BT5: pasek stanu "N docelowo", pole #f-target w panelu karteczki', () => {
  assert.match(html, /' docelowo<\/span>'/);
  assert.match(html, /<input type="checkbox" id="f-target">/);
  assert.match(html, /\$\('#f-target'\)\.checked=!!\(n&&n\.target===true\)/);
  assert.match(html, /if\(\$\('#f-target'\)\.checked\) n\.target=true; else delete n\.target;/);
});

test('AC-BT6: PDF z wybranym widokiem i dopiskiem w naglowku', () => {
  const f = html.slice(html.indexOf('function printHead'), html.indexOf('function printHead') + 1600);
  assert.match(f, /widok: /);
  assert.match(f, /ops\.countTarget\(board\)/);
});

test('AC-BT7: skill board - processes dokłada docelowe, sync traktuje je jak wymagania do zbudowania, format', () => {
  assert.match(skill, /`target`: `true`/);
  assert.match(skill, /\[Biz\] PRD R-xxx/);
  assert.match(skill, /docelow[a-z]* \(`target: true`\)[^\n]*wymagani/);
});

test('AC-BT8: przewodnik - widoki dzis / docelowo / oba', () => {
  const t = info.guide().sections.find(s => s.title === 'Tablica warsztatowa').items.join('\n');
  assert.match(t, /dziś \/ docelowo \/ oba/);
});

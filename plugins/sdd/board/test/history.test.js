// Cofnij / Ponow na tablicy. Kryteria z docs/specs/board-ui.md (AC-B19, AC-B20).
// Uruchom: node --test plugins/sdd/board/test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const ops = require('../board-ops');

const board = () => ({ title: 'T', lanes: ['A'], notes: [{ id: 'a', lane: 'A', col: 0, text: 'x', created: 't0', updated: 't0' }] });
const clone = b => JSON.parse(JSON.stringify(b));

test('AC-B19: record, undo, redo, limit', () => {
  const h = ops.createHistory(3);
  const b = board();
  h.reset(b);
  assert.strictEqual(h.canUndo(), false);
  assert.strictEqual(h.record(b), false, 'bez zmiany tresci nie ma kroku');
  b.notes[0].text = 'y'; assert.strictEqual(h.record(b), true);
  b.lanes.push('B'); h.record(b);
  assert.strictEqual(h.canUndo(), true);
  let s = h.undo();
  assert.deepStrictEqual(s.lanes, ['A']); assert.strictEqual(s.notes[0].text, 'y');
  s = h.undo();
  assert.strictEqual(s.notes[0].text, 'x'); assert.strictEqual(s.notes[0].updated, 't0', 'daty wracaja');
  assert.strictEqual(h.undo(), null);
  assert.strictEqual(h.canRedo(), true);
  s = h.redo(); assert.strictEqual(s.notes[0].text, 'y');
  s.notes[0].text = 'z'; h.record(s);
  assert.strictEqual(h.canRedo(), false, 'nowa zmiana po cofnieciu czysci redo');
  const h2 = ops.createHistory(2), c = board(); h2.reset(c);
  for (const t of ['1', '2', '3']) { c.notes[0].text = t; h2.record(c); }
  assert.strictEqual(h2.undo().notes[0].text, '2');
  assert.strictEqual(h2.undo().notes[0].text, '1');
  assert.strictEqual(h2.undo(), null, 'najstarszy krok ponad limit odpadl');
});

test('AC-B20: echo wlasnego zapisu vs zmiana z zewnatrz', () => {
  const h = ops.createHistory(50), b = board(); h.reset(b);
  b.notes[0].text = 'y'; h.record(b); const first = clone(b);
  b.notes[0].text = 'z'; h.record(b); const second = clone(b);
  const echo1 = clone(first); echo1.notes[0].updated = 't1'; echo1._sync = { a: 'board' }; echo1.updated = 't1'; echo1._module = { name: 'm' };
  assert.strictEqual(h.incoming(echo1), 'echo', 'echo starszego zapisu');
  const echo2 = clone(second); echo2.notes[0].updated = 't2'; echo2.updated = 't2';
  assert.strictEqual(h.incoming(echo2), 'echo');
  assert.strictEqual(h.canUndo(), true);
  assert.strictEqual(h.incoming(clone(echo2)), 'same', 'ponowne polaczenie z tym samym stanem');
  const agent = clone(echo2); agent.notes.push({ id: 'n2', lane: 'A', col: 1, text: 'od agenta' });
  assert.strictEqual(h.incoming(agent), 'external');
  assert.strictEqual(h.canUndo(), false); assert.strictEqual(h.canRedo(), false);
  const synced = clone(agent); synced.notes[0].synced = 't3';
  assert.strictEqual(h.incoming(synced), 'external', 'sync agenta to tez zmiana z zewnatrz');
  const u = h.undo(); assert.strictEqual(u, null);
});

// Okno Claude a limit polaczen przegladarki (0.46.3, docs/specs/claude-dock.md AC-T17..AC-T19).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../ui.js');
const js = fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8');

function fakeEnv() {
  const made = [];
  function ES(url) { this.url = url; this.closed = false; this.on = {}; made.push(this); }
  ES.prototype.close = function () { this.closed = true; };
  ES.prototype.addEventListener = function (ev, fn) { this.on[ev] = fn; };
  const listeners = [];
  const doc = { hidden: false, addEventListener: (ev, fn) => { if (ev === 'visibilitychange') listeners.push(fn); } };
  const flip = hidden => { doc.hidden = hidden; listeners.forEach(fn => fn()); };
  return { env: { EventSource: ES, document: doc }, made, flip };
}

test('AC-T17: strumienie okna Claude przez liveSource, bez new EventSource poza nim', () => {
  assert.match(js, /liveSource\('\/term-events'/);
  assert.match(js, /liveSource\('\/chat-events'/);
  const raw = js.match(/new (ES|EventSource)\(/g) || [];
  assert.deepStrictEqual(raw, ['new ES('], 'jedyne tworzenie zrodla jest w liveSource');
});

test('AC-T18: close() konczy zrodlo na stale - powrot karty go nie wskrzesza', () => {
  const { env, made, flip } = fakeEnv();
  const s = ui.liveSource('/term-events', {}, env);
  assert.strictEqual(made.length, 1);
  s.close();
  assert.strictEqual(made[0].closed, true);
  flip(true); flip(false);
  assert.strictEqual(made.length, 1, 'po close() bez nowego polaczenia');
});

test('AC-T18: liveSource podpina nazwane zdarzenia (exit) przy kazdym polaczeniu', () => {
  const { env, made, flip } = fakeEnv();
  let exits = 0;
  ui.liveSource('/term-events', { events: { exit: () => exits++ } }, env);
  made[0].on.exit();
  flip(true); flip(false);
  assert.strictEqual(made.length, 2);
  made[1].on.exit();
  assert.strictEqual(exits, 2);
});

function fakeTimers() {
  let id = 0; const t = new Map();
  return {
    env: { setTimeout: (fn, ms) => { t.set(++id, { fn, ms }); return id; }, clearTimeout: i => t.delete(i) },
    fire: () => { const all = [...t.values()]; t.clear(); all.forEach(x => x.fn()); },
    pending: () => [...t.values()].map(x => x.ms),
  };
}
function deferredSend() {
  const calls = [];
  const send = data => new Promise((ok, bad) => calls.push({ data, ok, bad }));
  return { send, calls };
}
const tick = () => new Promise(r => setImmediate(r));

test('AC-T19: kolejka wejscia - jedno zadanie naraz, reszta jedna paczka w kolejnosci', async () => {
  const { send, calls } = deferredSend();
  const tm = fakeTimers();
  const q = ui.inputQueue(send, {}, tm.env);
  q.push('a'); q.push('b'); q.push('c');
  assert.deepStrictEqual(calls.map(c => c.data), ['a']);
  calls[0].ok(); await tick();
  assert.deepStrictEqual(calls.map(c => c.data), ['a', 'bc']);
  calls[1].ok(); await tick();
  assert.strictEqual(calls.length, 2);
});

test('AC-T19: zadanie dluzsze niz 3 s -> komunikat; po dotarciu komunikat znika', async () => {
  const { send, calls } = deferredSend();
  const tm = fakeTimers();
  const seen = [];
  const q = ui.inputQueue(send, { state: (s, e) => seen.push(s) }, tm.env);
  q.push('x');
  assert.deepStrictEqual(tm.pending(), [3000]);
  tm.fire();
  assert.deepStrictEqual(seen, ['slow']);
  calls[0].ok(); await tick();
  assert.deepStrictEqual(seen, ['slow', 'ok']);
  assert.deepStrictEqual(tm.pending(), [], 'bez wiszacego licznika');
});

test('AC-T19: szybkie zadanie - bez komunikatow', async () => {
  const { send, calls } = deferredSend();
  const tm = fakeTimers();
  const seen = [];
  const q = ui.inputQueue(send, { state: s => seen.push(s) }, tm.env);
  q.push('x'); calls[0].ok(); await tick();
  assert.deepStrictEqual(seen, []);
  assert.deepStrictEqual(tm.pending(), []);
});

test('AC-T19: blad wysylki -> komunikat z bledem, kolejka dziala dalej, sukces czysci komunikat', async () => {
  const { send, calls } = deferredSend();
  const tm = fakeTimers();
  const seen = [];
  const q = ui.inputQueue(send, { state: (s, e) => seen.push(s + (e ? ':' + e.message : '')) }, tm.env);
  q.push('a'); q.push('b');
  calls[0].bad(new Error('HTTP 500')); await tick();
  assert.deepStrictEqual(seen, ['error:HTTP 500']);
  assert.deepStrictEqual(calls.map(c => c.data), ['a', 'b']);
  calls[1].ok(); await tick();
  assert.deepStrictEqual(seen, ['error:HTTP 500', 'ok']);
});

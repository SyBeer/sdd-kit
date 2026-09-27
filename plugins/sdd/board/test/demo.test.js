// Testy demo "wynik". Kryteria z docs/specs/progress-ui.md (AC-35..AC-38, zmiana 0.11.0).
// Uruchom: node --test plugins/sdd/board/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { readProgress } = require('../progress');
const { syncMap } = require('../board-ops');

const BOARD_DIR = path.join(__dirname, '..');
const DEMO_DIR = path.join(BOARD_DIR, '..', 'demo');
const DEMO_REQ = path.join(DEMO_DIR, 'zlecenia', 'requirements');
const stage = (p, key) => p.stages.find(s => s.key === key);

test('AC-35: demo zlecenia - etapy do Validate gotowe, 100%, aktualny krok Handover', () => {
  const p = readProgress(DEMO_REQ);
  assert.strictEqual(p.exists, true);
  assert.deepStrictEqual(p.stages.map(s => s.status), ['done', 'done', 'done', 'done', 'done', 'todo']);
  assert.strictEqual(stage(p, 'validate').counts.readiness, 100);
  assert.strictEqual(p.next.key, 'handover');
  assert.strictEqual(p.blockers.length, 0);
});

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? files(f) : [f];
  });
}

test('AC-37: demo bez nazw klienta, dostawcow i liczb rozpoznawczych', () => {
  const banned = ['flowlogist', 'base44', 'trans.eu', 'timocom', 'horizon', 'dwk', 'cbk', 'ehid', '660'];
  const all = files(DEMO_DIR).concat(path.join(BOARD_DIR, 'example-zlecenia.json'));
  const hits = [];
  all.forEach(f => {
    const text = (path.relative(DEMO_DIR, f) + '\n' + fs.readFileSync(f, 'utf8')).toLowerCase();
    banned.forEach(w => { if (text.includes(w)) hits.push(path.basename(f) + ': ' + w); });
  });
  assert.deepStrictEqual(hits, []);
});

test('AC-38: tablica demo - wszystkie typy karteczek, kazdy ref jest w swoim pliku', () => {
  const b = JSON.parse(fs.readFileSync(path.join(DEMO_REQ, '01-interview', 'board.json'), 'utf8'));
  const types = new Set(b.notes.map(n => n.type));
  ['ev', 'cmd', 'act', 'pol', 'rm', 'hot'].forEach(t => assert.ok(types.has(t), 'brak typu ' + t));
  const sync = syncMap(b, rel => {
    try { return fs.readFileSync(path.join(DEMO_REQ, rel), 'utf8'); } catch (e) { return null; }
  });
  const withRef = b.notes.filter(n => n.ref && n.file);
  assert.ok(withRef.length >= 40, 'za malo karteczek z ref: ' + withRef.length);
  const bad = withRef.filter(n => sync[n.id] !== 'synced').map(n => n.id + ' ' + n.ref + ' ' + sync[n.id]);
  assert.deepStrictEqual(bad, []);
});

// ---------------------------------------------------------------- serwer: konteksty /, /demo, /demo/start (0.12.0)
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
function freePort() {
  return new Promise(res => {
    const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
function call(port, method, url, body) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: { 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' } }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d, type: resp.headers['content-type'] || '' }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(body);
    r.end();
  });
}
// Katalog modulow usera z dwoma modulami (a, b); serwer startuje w module a.
function userRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ctx-'));
  ['a', 'b'].forEach(n => fs.cpSync(TEMPLATES, path.join(root, n, 'requirements'), { recursive: true }));
  return root;
}
function spawnServer(args, cwd) {
  return spawn(process.execPath, [path.join(BOARD_DIR, 'server.js')].concat(args),
    { cwd, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(cwd, 'config.json'), SDD_MODULES_ROOT: '' }) });
}
async function startServer() {
  const port = await freePort();
  const root = userRoot();
  const proc = spawnServer([path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)], root);
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  return { port, proc };
}

test('AC-41: jeden serwer - Twoj modul, /demo (wynik) i /demo/start', async () => {
  const { port, proc } = await startServer();
  try {
    const u = JSON.parse((await call(port, 'GET', '/api/progress')).body);
    assert.strictEqual(u.module.name, 'a');
    assert.ok(!u.demo);
    const d = JSON.parse((await call(port, 'GET', '/demo/api/progress')).body);
    assert.strictEqual(d.demo, 'wynik');
    assert.strictEqual(d.module.name, 'zlecenia');
    assert.strictEqual(d.needsRoot, false);
    assert.strictEqual(d.modules.length, 1);
    assert.strictEqual(d.stages.find(s => s.key === 'validate').counts.readiness, 100);
    const sb = JSON.parse((await call(port, 'GET', '/demo/start/api/board')).body);
    assert.strictEqual(sb._demo, 'start');
    assert.ok(sb.notes.length > 0);
    const db = JSON.parse((await call(port, 'GET', '/demo/api/board')).body);
    assert.strictEqual(db._demo, 'wynik');
    for (const pg of ['/demo', '/demo/board', '/demo/start']) {
      const r = await call(port, 'GET', pg);
      assert.strictEqual(r.code, 200, pg);
      assert.match(r.type, /text\/html/, pg);
    }
  } finally { proc.kill(); }
});

test('AC-42: /demo i /demo/start tylko podglad, Twoj kontekst dalej zapisuje', async () => {
  const { port, proc } = await startServer();
  try {
    for (const base of ['/demo', '/demo/start']) {
      const writes = [
        ['PUT', '/api/board', '{"lanes":[],"notes":[]}'],
        ['POST', '/api/intake?name=a.md', 'x'],
        ['DELETE', '/api/intake?name=a.md'],
        ['POST', '/api/root', '{"path":"/tmp"}'],
        ['POST', '/api/modules', '{"name":"x"}'],
        ['POST', '/api/modules/select', '{"name":"b"}'],
        ['GET', '/api/dirs?path=/tmp'],
      ];
      for (const [m, u, b] of writes) {
        const r = await call(port, m, base + u, b);
        assert.strictEqual(r.code, 403, m + ' ' + base + u);
        assert.match(r.body, /Demo - tylko podgląd\./);
      }
    }
    const ok = await call(port, 'PUT', '/api/board', '{"title":"t","lanes":["P"],"notes":[]}');
    assert.strictEqual(ok.code, 204);
  } finally { proc.kill(); }
});

test('AC-43: zmiana Twojego modulu nie rusza demo', async () => {
  const { port, proc } = await startServer();
  try {
    const r = await call(port, 'POST', '/api/modules/select', '{"name":"b"}');
    assert.strictEqual(r.code, 200);
    assert.strictEqual(JSON.parse((await call(port, 'GET', '/api/progress')).body).module.name, 'b');
    assert.strictEqual(JSON.parse((await call(port, 'GET', '/demo/api/progress')).body).module.name, 'zlecenia');
  } finally { proc.kill(); }
});

test('AC-45: zajety port - czytelny komunikat i kod 1', async () => {
  const blocker = http.createServer();
  await new Promise(res => blocker.listen(0, '127.0.0.1', res));
  const port = blocker.address().port;
  const root = userRoot();
  const proc = spawnServer([path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)], root);
  let out = '';
  proc.stdout.on('data', c => { out += c; }); proc.stderr.on('data', c => { out += c; });
  const code = await new Promise(res => proc.on('exit', res));
  blocker.close();
  assert.strictEqual(code, 1);
  assert.match(out, new RegExp('Port ' + port + ' jest zajęty'));
  assert.doesNotMatch(out, /node:events|EADDRINUSE/);
});

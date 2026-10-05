// Wersja skilli w sesjach Claude Code. Kryteria: docs/specs/session-version.md (AC-SV1..AC-SV8, zmiana 0.32.0).
// Uruchom: node --test plugins/sdd/board/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const MARK = path.join(ROOT, 'board', 'session-mark.js');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-sessions-'));
const run = (dir, arg, input) => spawnSync(process.execPath, [MARK, arg], {
  input, env: Object.assign({}, process.env, { SDD_SESSIONS_DIR: dir }), encoding: 'utf8' });

test('AC-SV1: hooks.json z SessionStart i SessionEnd uruchamiajacymi session-mark.js', () => {
  const h = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const cmd = ev => h[ev][0].hooks[0];
  assert.strictEqual(cmd('SessionStart').type, 'command');
  assert.match(cmd('SessionStart').command, /node "\$\{CLAUDE_PLUGIN_ROOT\}\/board\/session-mark\.js" start$/);
  assert.match(cmd('SessionEnd').command, /node "\$\{CLAUDE_PLUGIN_ROOT\}\/board\/session-mark\.js" end$/);
});

test('AC-SV2, AC-SV8: start zapisuje znacznik z wersja swojej kopii pluginu, nic nie wypisuje, kod 0', () => {
  const dir = path.join(tmp(), 'sessions');  // katalogu jeszcze nie ma
  const tr = path.join(tmp(), 't.jsonl'); fs.writeFileSync(tr, '{}');
  const r = run(dir, 'start', JSON.stringify({ session_id: 'abc-123', cwd: '/x/fv', transcript_path: tr }));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'abc-123.json'), 'utf8'));
  assert.strictEqual(m.version, VERSION);
  assert.strictEqual(m.cwd, '/x/fv');
  assert.strictEqual(m.transcript, tr);
  assert.ok(Date.parse(m.started) > 0);
});

test('AC-SV2: zle wejscie, zly identyfikator, brak uprawnien - kod 0, bez wyjscia, bez pliku', () => {
  const dir = tmp();
  [['start', 'to nie json'], ['start', JSON.stringify({ session_id: '../../etc/x' })], ['start', ''], ['bzdura', '{}']]
    .forEach(([a, i]) => { const r = run(dir, a, i); assert.strictEqual(r.status, 0); assert.strictEqual(r.stdout + r.stderr, ''); });
  assert.deepStrictEqual(fs.readdirSync(dir), []);
  const file = path.join(tmp(), 'plik'); fs.writeFileSync(file, '');   // "katalog" bedacy plikiem
  const r = run(path.join(file, 'sessions'), 'start', JSON.stringify({ session_id: 'a1' }));
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout + r.stderr, '');
});

test('AC-SV3: end usuwa znacznik; brak pliku to nie blad', () => {
  const dir = tmp();
  run(dir, 'start', JSON.stringify({ session_id: 's1', cwd: '/a' }));
  assert.ok(fs.existsSync(path.join(dir, 's1.json')));
  assert.strictEqual(run(dir, 'end', JSON.stringify({ session_id: 's1' })).status, 0);
  assert.ok(!fs.existsSync(path.join(dir, 's1.json')));
  assert.strictEqual(run(dir, 'end', JSON.stringify({ session_id: 's1' })).status, 0);
});

test('AC-SV4, AC-SV5: lista zywych sesji, stale wzgledem pluginu, sprzatanie starych', () => {
  const { listSessions } = require('../session-mark');
  const dir = tmp(), now = Date.now(), H = 3600e3;
  const put = (id, o, age) => {
    const f = path.join(dir, id + '.json'); fs.writeFileSync(f, JSON.stringify(o));
    const t = new Date(now - age); fs.utimesSync(f, t, t); return f;
  };
  const trOld = path.join(dir, 'old.jsonl'); fs.writeFileSync(trOld, '');
  fs.utimesSync(trOld, new Date(now - 20 * H), new Date(now - 20 * H));
  const trNew = path.join(dir, 'new.jsonl'); fs.writeFileSync(trNew, '');
  put('a', { version: '0.30.0', cwd: '/fv', started: 'x', transcript: trNew }, 30 * H);  // transkrypt swiezy -> zywa
  put('b', { version: '0.32.0', cwd: '/fv', started: 'x' }, 1 * H);                       // bez transkryptu, swiezy
  put('c', { version: '0.30.0', cwd: '/old', started: 'x', transcript: trOld }, 20 * H);   // martwa (12 h)
  const dead = put('d', { version: '0.29.0', cwd: '/d', started: 'x' }, 8 * 24 * H);      // > 7 dni -> usuniety
  fs.writeFileSync(path.join(dir, 'zle id!.json'), '{}');
  const list = listSessions({ dir, plugin: '0.32.0', now });
  assert.deepStrictEqual(list.map(s => [s.cwd, s.version, s.stale]).sort(), [['/fv', '0.30.0', true], ['/fv', '0.32.0', false]]);
  assert.ok(!fs.existsSync(dead));
  assert.ok(!fs.existsSync(path.join(dir, 'zle id!.json')));
  assert.deepStrictEqual(listSessions({ dir: path.join(dir, 'brak'), plugin: '0.32.0', now }), []);
  // serwer: /api/version zwraca sessions, w demo pusta lista
  const srv = fs.readFileSync(path.join(ROOT, 'board', 'server.js'), 'utf8');
  assert.match(srv, /sessions: ctx\.demo \? \[\] : listSessions\(/);
});

test('AC-SV6: plakietka wersji - dopisek i podpowiedz przy nieaktualnej sesji', () => {
  const ui = require('../ui');
  const ok = ui.versionBadge({ running: '0.32.0', disk: '0.32.0', plugin: '0.32.0',
    sessions: [{ version: '0.32.0', cwd: '/fv', stale: false }] });
  assert.strictEqual(ok.stale, false);
  assert.strictEqual(ok.text, 'v0.32.0');
  assert.match(ok.title, /1 otwart/);
  const bad = ui.versionBadge({ running: '0.32.0', disk: '0.32.0', plugin: '0.32.0',
    sessions: [{ version: '0.30.0', cwd: '/x/fv-manager', stale: true }] });
  assert.strictEqual(bad.stale, true);
  assert.match(bad.text, /· sesja Claude nieaktualna$/);
  assert.match(bad.title, /\/x\/fv-manager[^\n]*0\.30\.0/);
  assert.match(bad.title, /zamknij te sesje i otwórz nową - skille ładują się przy starcie sesji/i);
  // bez sesji - jak dotad
  assert.strictEqual(ui.versionBadge({ running: '0.32.0', disk: '0.32.0' }).text, 'v0.32.0');
});

test('AC-SV7: przewodnik - wersja skilli w sesjach', () => {
  const g = JSON.stringify(require('../info').guide());
  assert.match(g, /sesja Claude nieaktualna/);
});

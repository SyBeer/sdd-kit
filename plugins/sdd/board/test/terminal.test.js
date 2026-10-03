// Testy okna Claude Code. Kryteria z docs/specs/claude-dock.md (AC-T1..AC-T8, zmiana 0.25.0).
// Prawdziwy pty (Python), bez atrap.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { TermSession, claudeArgv, available } = require('../terminal');
const ui = require('../ui');

const skip = available() ? false : 'brak Pythona 3 z modulem pty';

function until(s, re, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout, wyjscie: ' + JSON.stringify(s.buffer().toString()))), ms || 4000);
    const check = () => { if (re.test(s.buffer().toString())) { clearTimeout(t); s.off('data', check); res(); } };
    s.on('data', check); check();
  });
}
const exited = s => new Promise(res => s.once('exit', res));

test('AC-T1: polecenie w pty o zadanym rozmiarze, wejscie, kod wyjscia', { skip }, async () => {
  const s = new TermSession();
  const done = exited(s);
  s.start({ cwd: os.tmpdir(), cols: 100, rows: 30, argv: ['sh', '-c', 'stty size; read x; echo "got:$x"; exit 3'] });
  assert.strictEqual(s.state().running, true);
  await until(s, /30 100/);
  s.write('abc\r');
  await until(s, /got:abc/);
  assert.strictEqual(await done, 3);
  assert.strictEqual(s.state().running, false);
  assert.strictEqual(s.state().exitCode, 3);
});

test('AC-T2: resize zmienia rozmiar widziany przez program', { skip }, async () => {
  const s = new TermSession();
  s.start({ cwd: os.tmpdir(), cols: 80, rows: 24, argv: ['sh', '-c', 'echo ready; read a; stty size; read b'] });
  await until(s, /ready/);
  s.resize(120, 40);
  await new Promise(r => setTimeout(r, 150));
  s.write('\r');
  await until(s, /40 120/);
  s.stop();
});

test('AC-T3: bufor wyjscia z limitem od poczatku', { skip }, async () => {
  const s = new TermSession({ limit: 10 });
  const done = exited(s);
  s.start({ cwd: os.tmpdir(), cols: 80, rows: 24, argv: ['sh', '-c', 'printf 0123456789ABCDEF'] });
  await done;
  const b = s.buffer().toString();
  assert.ok(b.length <= 10, 'za dlugi bufor: ' + b.length);
  assert.ok(b.endsWith('ABCDEF'), b);
});

test('AC-T4: stop konczy dlugo dzialajacy program', { skip }, async () => {
  const s = new TermSession();
  s.start({ cwd: os.tmpdir(), cols: 80, rows: 24, argv: ['sleep', '100'] });
  const t0 = Date.now();
  const done = exited(s);
  s.stop();
  await done;
  assert.ok(Date.now() - t0 < 3000);
  assert.strictEqual(s.state().running, false);
});

test('AC-T5: srodowisko bez CLAUDECODE, z TERM=xterm-256color', { skip }, async () => {
  const s = new TermSession();
  const done = exited(s);
  s.start({ cwd: os.tmpdir(), cols: 80, rows: 24, argv: ['sh', '-c', 'echo "[$CLAUDECODE][$TERM]"'],
    env: Object.assign({}, process.env, { CLAUDECODE: '1' }) });
  await done;
  assert.match(s.buffer().toString(), /\[\]\[xterm-256color\]/);
});

test('AC-T6: claudeArgv - powloka logowania, SDD_CLAUDE_CMD', () => {
  assert.deepStrictEqual(claudeArgv({ SHELL: '/bin/zsh' }), ['/bin/zsh', '-l', '-c', 'exec claude']);
  assert.deepStrictEqual(claudeArgv({}), ['/bin/zsh', '-l', '-c', 'exec claude']);
  assert.deepStrictEqual(claudeArgv({ SHELL: '/bin/bash', SDD_CLAUDE_CMD: '/opt/x/claude --model opus' }),
    ['/bin/bash', '-l', '-c', 'exec /opt/x/claude --model opus']);
});

test('AC-T8: dockWidth - domyslna 520, zakres 320 .. 70% okna', () => {
  assert.strictEqual(ui.dockWidth(null, 1600), 520);
  assert.strictEqual(ui.dockWidth('abc', 1600), 520);
  assert.strictEqual(ui.dockWidth('100', 1600), 320);
  assert.strictEqual(ui.dockWidth('1500', 1600), 1120);
  assert.strictEqual(ui.dockWidth('700', 1600), 700);
  assert.strictEqual(ui.dockWidth(null, 600), 420);
});

// ---------------------------------------------------------------- serwer (AC-T7)
const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
function freePort() {
  return new Promise(res => {
    const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
function call(port, method, url, body, extra) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: Object.assign({ 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' }, extra) }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}
function stream(port, ms) {
  return new Promise((res, rej) => {
    let d = '';
    const r = http.get({ host: '127.0.0.1', port, path: '/term-events', headers: { Host: 'localhost:' + port } }, resp => {
      resp.on('data', c => { d += c; });
      setTimeout(() => { r.destroy(); res(d); }, ms);
    });
    r.on('error', e => (d ? res(d) : rej(e)));
  });
}

test('AC-T7: serwer - zabezpieczenia, start w folderze modulu, odtworzenie, stop', { skip }, async () => {
  const port = await freePort();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-term-'));
  fs.cpSync(TEMPLATES, path.join(root, 'a', 'requirements'), { recursive: true });
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '',
      SDD_CLAUDE_CMD: 'sh -c "pwd; echo hello-term; sleep 30"' }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  try {
    assert.strictEqual((await call(port, 'POST', '/api/term/start', { cols: 80, rows: 24 }, { 'x-sdd': '' })).code, 403);
    assert.strictEqual((await call(port, 'GET', '/term-events', undefined, { Host: 'evil.example:' + port })).code, 403);
    assert.strictEqual((await call(port, 'GET', '/api/term', undefined, { Host: 'evil.example:' + port })).code, 403);
    assert.strictEqual((await call(port, 'POST', '/demo/api/term/start', { cols: 80, rows: 24 })).code, 403);
    let st = JSON.parse((await call(port, 'GET', '/api/term')).body);
    assert.strictEqual(st.running, false); assert.strictEqual(st.available, true);
    assert.strictEqual((await call(port, 'POST', '/api/term/start', { cols: 80, rows: 24 })).code, 200);
    st = JSON.parse((await call(port, 'GET', '/api/term')).body);
    assert.strictEqual(st.running, true);
    assert.strictEqual(fs.realpathSync(st.cwd), fs.realpathSync(path.join(root, 'a')));
    await new Promise(r => setTimeout(r, 600));
    const s = await stream(port, 400);
    const first = JSON.parse(s.split('\n').find(l => l.startsWith('data: ')).slice(6));
    assert.strictEqual(first.replay, true);
    const text = Buffer.from(first.d, 'base64').toString();
    assert.match(text, /hello-term/);
    assert.ok(text.includes(fs.realpathSync(path.join(root, 'a'))) || text.includes(path.join(root, 'a')), text);
    assert.strictEqual((await call(port, 'POST', '/api/term/stop', {})).code, 200);
    await new Promise(r => setTimeout(r, 500));
    st = JSON.parse((await call(port, 'GET', '/api/term')).body);
    assert.strictEqual(st.running, false);
  } finally {
    proc.kill();
  }
});

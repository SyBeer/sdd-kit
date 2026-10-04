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
const { TermSession, claudeArgv, available, childEnv, historyDir, hasHistory } = require('../terminal');
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

test('AC-T10: resize - ten sam rozmiar nie jest wysylany ponownie, force wysyla zawsze', { skip }, async () => {
  const s = new TermSession();
  s.start({ cwd: os.tmpdir(), cols: 80, rows: 24, argv: ['sleep', '30'] });
  assert.strictEqual(s.resize(80, 24), false);
  assert.strictEqual(s.resize(100, 30), true);
  assert.strictEqual(s.resize(100, 30), false);
  assert.strictEqual(s.resize(100, 30, true), true);
  assert.deepStrictEqual(s.state().size, { cols: 100, rows: 30 });
  const done = exited(s); s.stop(); await done;
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

test('AC-T5: childEnv usuwa zmienne sesji Claude Code (zapis transkryptu, /resume)', () => {
  const e = childEnv({ PATH: '/bin', CLAUDECODE: '1', CLAUDE_CODE_CHILD_SESSION: '1', CLAUDE_CODE_SESSION_ID: 'x',
    CLAUDE_CODE_ENTRYPOINT: 'cli', CLAUDE_PID: '123', CLAUDE_EFFORT: 'high', CLAUDE_CONFIG_DIR: '/cfg' });
  ['CLAUDECODE', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_PID', 'CLAUDE_EFFORT']
    .forEach(k => assert.strictEqual(e[k], undefined, k));
  assert.strictEqual(e.PATH, '/bin');
  assert.strictEqual(e.CLAUDE_CONFIG_DIR, '/cfg');
  assert.strictEqual(e.TERM, 'xterm-256color');
});

test('AC-T6: claudeArgv - powloka logowania, SDD_CLAUDE_CMD', () => {
  assert.deepStrictEqual(claudeArgv({ SHELL: '/bin/zsh' }), ['/bin/zsh', '-l', '-c', 'exec claude']);
  assert.deepStrictEqual(claudeArgv({}), ['/bin/zsh', '-l', '-c', 'exec claude']);
  assert.deepStrictEqual(claudeArgv({ SHELL: '/bin/bash', SDD_CLAUDE_CMD: '/opt/x/claude --model opus' }),
    ['/bin/bash', '-l', '-c', 'exec /opt/x/claude --model opus']);
});

test('AC-T11: wznowienie rozmowy - --continue, folder historii Claude Code', () => {
  assert.deepStrictEqual(claudeArgv({ SHELL: '/bin/zsh' }, { resume: true }), ['/bin/zsh', '-l', '-c', 'exec claude --continue']);
  assert.deepStrictEqual(claudeArgv({ SHELL: '/bin/zsh', SDD_CLAUDE_CMD: 'x --y' }, { resume: true }), ['/bin/zsh', '-l', '-c', 'exec x --y --continue']);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-cc-'));
  const env = { CLAUDE_CONFIG_DIR: cfg };
  assert.strictEqual(historyDir('/Users/tomek/_DEV_/repos/fv-manager', env), path.join(cfg, 'projects', '-Users-tomek--DEV--repos-fv-manager'));
  assert.strictEqual(hasHistory('/Users/a/mod', env), false);
  fs.mkdirSync(historyDir('/Users/a/mod', env), { recursive: true });
  assert.strictEqual(hasHistory('/Users/a/mod', env), false);
  fs.writeFileSync(path.join(historyDir('/Users/a/mod', env), 'abc.jsonl'), '{}\n');
  assert.strictEqual(hasHistory('/Users/a/mod', env), true);
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
  // zapisana rozmowa Claude Code dla folderu modulu (AC-T12)
  const ccfg = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ccfg-'));
  const hdir = path.join(ccfg, 'projects', fs.realpathSync(path.join(root, 'a')).replace(/[^A-Za-z0-9]/g, '-'));
  fs.mkdirSync(hdir, { recursive: true }); fs.writeFileSync(path.join(hdir, 'x.jsonl'), '{}\n');
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '',
      SDD_CLAUDE_CMD: "sh -c 'pwd; echo hello-term; echo args: $0 $@; sleep 30'", CLAUDE_CONFIG_DIR: ccfg }) });
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
    // AC-T12: wznowienie - historia w folderze CLAUDE_CONFIG_DIR, start z --continue
    st = JSON.parse((await call(port, 'GET', '/api/term')).body);
    assert.strictEqual(st.canResume, true);
    assert.strictEqual((await call(port, 'POST', '/api/term/start', { cols: 80, rows: 24, resume: true })).code, 200);
    await new Promise(r => setTimeout(r, 600));
    const s2 = await stream(port, 400);
    const f2 = JSON.parse(s2.split('\n').find(l => l.startsWith('data: ')).slice(6));
    assert.match(Buffer.from(f2.d, 'base64').toString(), /args:.*--continue/);
    assert.strictEqual((await call(port, 'POST', '/api/term/stop', {})).code, 200);
    await new Promise(r => setTimeout(r, 500));
    st = JSON.parse((await call(port, 'GET', '/api/term')).body);
    assert.strictEqual(st.running, false);
  } finally {
    proc.kill();
  }
});

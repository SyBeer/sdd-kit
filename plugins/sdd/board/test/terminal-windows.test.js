// Testy okna Claude Code na Windows (ConPTY). Kryteria z docs/specs/claude-dock.md, czesc "Windows 10 / 11" (0.33.0).
// Funkcje czyste (cytowanie, ramki, wybor polecenia claude, dostepnosc) - na kazdej platformie.
// Prawdziwa pseudokonsola - tylko na Windows (GitHub Actions: windows-latest, windows-11-arm), programy Node bez atrap.
// Prawdziwy claude z npm: dodatkowo SDD_TEST_REAL_CLAUDE=1 (AC-W12).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const terminal = require('../terminal');
const { TermSession, winQuote, winCommandLine, frame, windowsClaude, availability, windowsBuild, helperArgs } = terminal;
const ui = require('../ui');

const W = path.win32;
const onWin = process.platform === 'win32';
const winOnly = onWin ? false : 'tylko Windows (ConPTY)';

// ---------------------------------------------------------------- funkcje czyste

// Odwrotnosc CommandLineToArgvW (reguly MSVCRT) - zeby sprawdzic winQuote bez Windows.
function argvFromLine(line) {
  const out = []; let i = 0;
  while (i < line.length) {
    while (line[i] === ' ' || line[i] === '\t') i++;
    if (i >= line.length) break;
    let arg = '', quoted = false;
    for (; i < line.length; i++) {
      const c = line[i];
      if (c === '\\') {
        let n = 0; while (line[i] === '\\') { n++; i++; }
        if (line[i] === '"') { arg += '\\'.repeat(n >> 1); if (n % 2) { arg += '"'; continue; } i--; continue; }
        arg += '\\'.repeat(n); i--; continue;
      }
      if (c === '"') { if (quoted && line[i + 1] === '"') { arg += '"'; i++; continue; } quoted = !quoted; continue; }
      if (!quoted && (c === ' ' || c === '\t')) break;
      arg += c;
    }
    out.push(arg);
  }
  return out;
}

const TRICKY = ['zwykly', 'ze spacja', 'q"uote', 'back\\slash\\', 'C:\\Program Files\\x\\', '', 'ż ó 🙂', 'a\\\\"b', '\\\\server\\share'];

test('AC-W7: winQuote / winCommandLine - CommandLineToArgvW odtwarza argumenty bez zmian', () => {
  assert.strictEqual(winQuote('abc'), 'abc');
  assert.strictEqual(winQuote(''), '""');
  assert.strictEqual(winQuote('a b'), '"a b"');
  assert.strictEqual(winQuote('back\\slash\\'), 'back\\slash\\');          // bez spacji i cudzyslowu - bez zmian
  assert.strictEqual(winQuote('C:\\P F\\'), '"C:\\P F\\\\"');              // ukosnik przed zamykajacym cudzyslowem podwojony
  assert.deepStrictEqual(argvFromLine(winCommandLine(TRICKY)), TRICKY);
});

test('AC-W8: frame - typ 1 B + dlugosc 4 B big-endian + dane', () => {
  const f = frame('d', Buffer.from('zażółć', 'utf8'));
  assert.strictEqual(f[0], 'd'.charCodeAt(0));
  assert.strictEqual(f.readUInt32BE(1), Buffer.byteLength('zażółć'));
  assert.strictEqual(f.subarray(5).toString('utf8'), 'zażółć');
  const r = frame('r', '120 40');
  assert.strictEqual(r.toString('latin1'), 'r\x00\x00\x00\x06120 40');
  assert.strictEqual(frame('d', '').length, 5);
});

function fakeFs(files) {
  const map = {}; Object.keys(files).forEach(k => { map[k.toLowerCase()] = files[k]; });
  return { exists: p => Object.prototype.hasOwnProperty.call(map, p.toLowerCase()), read: p => map[p.toLowerCase()] };
}
const NPM = 'C:\\Users\\Jan Kowalski\\AppData\\Roaming\\npm';
const NODE = 'C:\\Program Files\\nodejs';
const SHIM_JS = '@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n\r\n' +
  'IF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n)\r\n\r\n' +
  'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*\r\n';
const SHIM_EXE = '@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n' +
  '"%dp0%\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe"   %*\r\n';

test('AC-W9: windowsClaude - SDD_CLAUDE_CMD, claude.exe, shim npm (js i exe), cmd /c', () => {
  const env = { PATH: NODE + ';' + NPM + ';C:\\Windows\\system32', USERPROFILE: 'C:\\Users\\Jan Kowalski', ComSpec: 'C:\\Windows\\system32\\cmd.exe' };
  // 1. SDD_CLAUDE_CMD - surowa linia polecen
  assert.strictEqual(windowsClaude(Object.assign({ SDD_CLAUDE_CMD: 'node x.js --a' }, env), fakeFs({})).line, 'node x.js --a');
  assert.strictEqual(windowsClaude(Object.assign({ SDD_CLAUDE_CMD: 'node x.js' }, env), fakeFs({}), { resume: true }).line, 'node x.js --continue');
  // 2. claude.exe w PATH, potem ~/.local/bin (instalator natywny)
  const exePath = 'C:\\Tools\\claude.exe';
  let r = windowsClaude(Object.assign({}, env, { PATH: 'C:\\Tools;' + env.PATH }), fakeFs({ [exePath]: '' }));
  assert.strictEqual(r.how, 'exe'); assert.deepStrictEqual(argvFromLine(r.line), [exePath]);
  const local = W.join(env.USERPROFILE, '.local', 'bin', 'claude.exe');
  r = windowsClaude(env, fakeFs({ [local]: '' }), { resume: true });
  assert.strictEqual(r.how, 'exe'); assert.deepStrictEqual(argvFromLine(r.line), [local, '--continue']);
  // 3. shim npm wskazujacy cli.js -> node + cli.js (bez pliku wsadowego); node z PATH
  const cli = W.join(NPM, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
  r = windowsClaude(env, fakeFs({ [W.join(NPM, 'claude.cmd')]: SHIM_JS, [cli]: '', [W.join(NODE, 'node.exe')]: '' }), { resume: true });
  assert.strictEqual(r.how, 'npm');
  assert.deepStrictEqual(argvFromLine(r.line), [W.join(NODE, 'node.exe'), cli, '--continue']);
  // shim npm wskazujacy claude.exe w paczce
  const bin = W.join(NPM, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  r = windowsClaude(env, fakeFs({ [W.join(NPM, 'claude.cmd')]: SHIM_EXE, [bin]: '' }));
  assert.strictEqual(r.how, 'npm'); assert.deepStrictEqual(argvFromLine(r.line), [bin]);
  // 4. nic nie pasuje (np. shim bez pliku docelowego) -> cmd.exe /d /s /c "claude"
  r = windowsClaude(env, fakeFs({ [W.join(NPM, 'claude.cmd')]: SHIM_JS }), { resume: true });
  assert.strictEqual(r.how, 'cmd');
  assert.deepStrictEqual(argvFromLine(r.line), ['C:\\Windows\\system32\\cmd.exe', '/d', '/s', '/c', 'claude --continue']);
  // zmienna Path (tak nazywa ja Windows) tez dziala
  r = windowsClaude({ Path: 'C:\\Tools', USERPROFILE: 'C:\\U' }, fakeFs({ [exePath]: '' }));
  assert.strictEqual(r.how, 'exe');
});

test('AC-W10: availability - Windows: build >= 17763 i powershell.exe; macOS/Linux: Python', () => {
  assert.strictEqual(windowsBuild('10.0.22631'), 22631);
  assert.strictEqual(windowsBuild('6.1.7601'), 7601);
  assert.strictEqual(windowsBuild('x'), 0);
  const ps = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  const env = { SystemRoot: 'C:\\Windows' };
  const win = (release, files) => availability(env, { platform: 'win32', release, exists: fakeFs(files).exists });
  assert.deepStrictEqual(win('10.0.22631', { [ps]: '' }), { ok: true, reason: null });
  let a = win('10.0.17134', { [ps]: '' });
  assert.strictEqual(a.ok, false); assert.match(a.reason, /1809/);
  a = win('10.0.22631', {});
  assert.strictEqual(a.ok, false); assert.match(a.reason, /PowerShell/);
  a = availability({ SDD_PYTHON: '' }, { platform: 'linux', release: '6.1', exists: () => false, python: null });
  assert.strictEqual(a.ok, false); assert.match(a.reason, /Python/);
});

test('AC-W10: pomocnik przez -EncodedCommand (nie -File), bez okna, skrypt laduje conpty.cs', () => {
  const args = helperArgs({ cols: 100, rows: 30, line: 'claude', cwd: 'C:\\Moje Projekty\\Zażółć' });
  assert.ok(args.includes('-EncodedCommand'));
  assert.ok(!args.includes('-File'));
  ['-NoProfile', '-NonInteractive'].forEach(f => assert.ok(args.includes(f), f));
  const script = Buffer.from(args[args.indexOf('-EncodedCommand') + 1], 'base64').toString('utf16le');
  assert.match(script, /Add-Type -TypeDefinition/);
  assert.match(script, /\[SddConPty\]::Run\(100, 30, /);
  assert.match(script, /LanguageMode/);           // Constrained Language -> czytelny kod 125, nie tajemniczy blad
  // sciezka modulu przechodzi bez cytowania (base64), polskie znaki zostaja
  const b64 = script.match(/Run\(100, 30, '([^']+)', '([^']+)'\)/);
  assert.strictEqual(Buffer.from(b64[2], 'base64').toString('utf8'), 'C:\\Moje Projekty\\Zażółć');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'conpty.cs')));
});

test('AC-W11: ui.termOptions - windowsPty tylko na Windows; ui.termKey - kopiuj / wklej poza macOS', () => {
  assert.strictEqual(ui.termOptions({ platform: 'darwin' }).windowsPty, undefined);
  assert.deepStrictEqual(ui.termOptions({ platform: 'win32', windowsBuild: 22631 }).windowsPty, { backend: 'conpty', buildNumber: 22631 });
  assert.match(ui.termOptions({ platform: 'win32' }).fontFamily, /Cascadia Mono/);
  const k = (key, mods) => Object.assign({ type: 'keydown', key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, mods);
  assert.strictEqual(ui.termKey(k('c', { ctrlKey: true }), true, false), 'copy');
  assert.strictEqual(ui.termKey(k('c', { ctrlKey: true }), false, false), null);   // bez zaznaczenia - przerwanie dla Claude
  assert.strictEqual(ui.termKey(k('c', { ctrlKey: true }), true, true), null);     // macOS: Cmd+C robi przegladarka
  assert.strictEqual(ui.termKey(k('v', { ctrlKey: true }), false, false), 'paste');
  assert.strictEqual(ui.termKey(k('v', { ctrlKey: true }), false, true), null);
  assert.strictEqual(ui.termKey(k('c', { ctrlKey: true, type: 'keyup' }), true, false), null);
  assert.strictEqual(ui.termKey(k('c', { ctrlKey: true, altKey: true }), true, false), null);
});

// ---------------------------------------------------------------- prawdziwa pseudokonsola (Windows)

// Tekst z wyjscia ConPTY: bez sekwencji sterujacych i bez podzialu linii (ConPTY przerysowuje ekran po swojemu).
const plain = b => String(b).replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '').replace(/\x1b\[[0-9;?<>=]*[ -/]*[@-~]/g, '')
  .replace(/\x1b[()][0-9A-Za-z]/g, '').replace(/\x1b[=>78DEHM]/g, '').replace(/[\r\n]/g, '');
function until(s, re, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { s.off('data', check); rej(new Error('timeout ' + re + ', wyjscie: ' + JSON.stringify(plain(s.buffer())).slice(-1500))); }, ms || 15000);
    function check() { const m = plain(s.buffer()).match(re); if (m) { clearTimeout(t); s.off('data', check); res(m); } }
    s.on('data', check); check();
  });
}
const exited = s => new Promise(res => s.once('exit', res));
const hex = s => Buffer.from(s, 'utf8').toString('hex');
const node = code => [process.execPath, '-e', code];
// Folder ze spacja i polskimi znakami - jak "C:\Users\Jan Kowalski\Moje Projekty\Zażółć"
const cwd = () => { const d = path.join(os.tmpdir(), 'sdd term ' + Date.now() + ' zażółć'); fs.mkdirSync(d, { recursive: true }); return d; };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
async function gone(pids, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (!pids.some(alive)) return true; await new Promise(r => setTimeout(r, 100)); }
  return !pids.some(alive);
}

test('AC-W1: pseudokonsola - TTY o zadanym rozmiarze, folder, wejscie, kod wyjscia', { skip: winOnly, timeout: 60000 }, async () => {
  const s = new TermSession();
  const done = exited(s);
  const dir = cwd();
  s.start({ cwd: dir, cols: 100, rows: 30, argv: node(
    "const h=s=>Buffer.from(String(s)).toString('hex');" +
    "console.log('tty:'+process.stdout.isTTY+':'+process.stdin.isTTY+':'+process.stdout.columns+'x'+process.stdout.rows);" +
    "console.log('cwd:'+h(process.cwd())+':');" +
    "process.stdin.setEncoding('utf8');process.stdin.once('data',d=>{console.log('got:'+d.trim()+':');process.exit(3)})") });
  assert.strictEqual(s.state().running, true);
  await until(s, /tty:true:true:100x30/);
  await until(s, new RegExp('cwd:' + hex(dir) + ':', 'i'));
  s.write('abc\r');
  await until(s, /got:abc:/);
  assert.strictEqual(await done, 3);
  assert.strictEqual(s.state().running, false);
  assert.strictEqual(s.state().exitCode, 3);
});

test('AC-W2: resize - program dostaje zdarzenie i widzi nowy rozmiar', { skip: winOnly, timeout: 60000 }, async () => {
  const s = new TermSession();
  s.start({ cwd: cwd(), cols: 80, rows: 24, argv: node(
    "process.stdout.on('resize',()=>console.log('ev:'+process.stdout.columns+'x'+process.stdout.rows));" +
    "console.log('ready');process.stdin.setEncoding('utf8');" +
    "process.stdin.on('data',()=>console.log('now:'+process.stdout.columns+'x'+process.stdout.rows))") });
  await until(s, /ready/);
  assert.strictEqual(s.resize(120, 40), true);
  await until(s, /ev:120x40/);
  s.write('\r');
  await until(s, /now:120x40/);
  const done = exited(s); s.stop(); await done;
});

test('AC-W3: polskie znaki i emoji w obie strony (UTF-8)', { skip: winOnly, timeout: 60000 }, async () => {
  const text = 'zażółć gęślą jaźń 🙂';
  const s = new TermSession();
  s.start({ cwd: cwd(), cols: 120, rows: 30, argv: node(
    "console.log('ready');process.stdin.setEncoding('utf8');" +
    "process.stdin.once('data',d=>{const t=d.replace(/[\\r\\n]+$/,'');console.log('hex:'+Buffer.from(t).toString('hex')+':');console.log('echo:'+t+':');setTimeout(()=>process.exit(0),200)})") });
  await until(s, /ready/);
  s.write(text + '\r');
  await until(s, new RegExp('hex:' + hex(text) + ':'));
  await until(s, /echo:zażółć gęślą jaźń 🙂:/);
  await exited(s);
});

test('AC-W4: stop konczy program i jego proces potomny w < 3 s', { skip: winOnly, timeout: 60000 }, async () => {
  const s = new TermSession();
  s.start({ cwd: cwd(), cols: 80, rows: 24, argv: node(
    "const c=require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});" +
    "console.log('pids:'+process.pid+':'+c.pid+':');setInterval(()=>{},1000)") });
  const m = await until(s, /pids:(\d+):(\d+):/);
  const pids = [+m[1], +m[2]];
  assert.ok(pids.every(alive));
  const t0 = Date.now();
  const done = exited(s);
  s.stop();
  await done;
  assert.ok(await gone(pids, 3000), 'zostaly procesy: ' + pids.filter(alive));
  assert.ok(Date.now() - t0 < 3500);
});

test('AC-W5: zamkniete wejscie pomocnika (koniec serwera) konczy program w < 5 s', { skip: winOnly, timeout: 60000 }, async () => {
  const s = new TermSession();
  s.start({ cwd: cwd(), cols: 80, rows: 24, argv: node(
    "const c=require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});" +
    "console.log('pids:'+process.pid+':'+c.pid+':');setInterval(()=>{},1000)") });
  const m = await until(s, /pids:(\d+):(\d+):/);
  const done = exited(s);
  s.proc.stdin.end();
  await done;
  assert.ok(await gone([+m[1], +m[2]], 5000));
});

test('AC-W6: Ctrl+C trafia do programu jako przerwanie', { skip: winOnly, timeout: 60000 }, async () => {
  const s = new TermSession();
  const done = exited(s);
  s.start({ cwd: cwd(), cols: 80, rows: 24, argv: node(
    "process.on('SIGINT',()=>{console.log('sigint:ok');setTimeout(()=>process.exit(7),200)});console.log('ready');setInterval(()=>{},1000)") });
  await until(s, /ready/);
  s.write('\x03');
  await until(s, /sigint:ok/);
  assert.strictEqual(await done, 7);
});

test('AC-W7: argumenty ze spacjami, cudzyslowami i ukosnikami docieraja do programu bez zmian', { skip: winOnly, timeout: 60000 }, async () => {
  const s = new TermSession();
  const done = exited(s);
  s.start({ cwd: cwd(), cols: 200, rows: 30, argv: node("console.log('argv:'+Buffer.from(JSON.stringify(process.argv.slice(1))).toString('hex')+':')").concat(TRICKY) });
  await until(s, new RegExp('argv:' + hex(JSON.stringify(TRICKY)) + ':'));
  await done;
});

test('AC-W8: duze wklejenie (100 KB) i resize nie mieszaja sie', { skip: winOnly, timeout: 90000 }, async () => {
  const s = new TermSession();
  s.start({ cwd: cwd(), cols: 80, rows: 24, argv: node(
    "process.stdin.setRawMode(true);let n=0;console.log('ready');" +
    "process.stdin.on('data',d=>{n+=d.length;if(n>=100000&&!global.x){global.x=1;console.log('count:'+n+':'+process.stdout.columns+'x'+process.stdout.rows)}})") });
  await until(s, /ready/);
  s.write('x'.repeat(100000));
  s.resize(132, 43);
  const m = await until(s, /count:(\d+):(\d+)x(\d+)/, 60000);
  assert.strictEqual(+m[1], 100000, 'bajty wejscia: ' + m[1]);
  const done = exited(s); s.stop(); await done;
  // rozmiar mogl przyjsc przed lub po wejsciu - wazne, ze ramka rozmiaru nie trafila do wejscia (licznik rowny)
});

test('AC-W12: prawdziwy claude z npm - --version i ekran startowy w pseudokonsoli', {
  skip: onWin && process.env.SDD_TEST_REAL_CLAUDE === '1' ? false : 'tylko Windows z SDD_TEST_REAL_CLAUDE=1', timeout: 120000 }, async () => {
  const how = windowsClaude(process.env);
  console.log('claude przez:', how.how, how.line);
  let s = new TermSession();
  let done = exited(s);
  s.start({ cwd: cwd(), cols: 120, rows: 30, line: how.line + ' --version' });
  await until(s, /\d+\.\d+\.\d+/, 60000);
  assert.strictEqual(await done, 0);
  s = new TermSession();
  done = exited(s);
  s.start({ cwd: cwd(), cols: 120, rows: 30 });   // domyslne polecenie claude
  await until(s, /Claude Code|Welcome|theme|trust|Let's get started/i, 60000);
  s.stop();
  await done;
  assert.strictEqual(s.state().running, false);
});

// ---------------------------------------------------------------- serwer na Windows (AC-T7 + AC-W11)

const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
const freePort = () => new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(port, method, url, body) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: { 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' } }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

test('AC-W11: GET /api/term - platform, windowsBuild, reason (kazda platforma)', { timeout: 60000 }, async () => {
  const port = await freePort();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-termw-'));
  fs.cpSync(TEMPLATES, path.join(root, 'a', 'requirements'), { recursive: true });
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '',
      SDD_CLAUDE_CMD: winCommandLine(node("console.log('hello-term:'+Buffer.from(process.cwd()).toString('hex')+':');setInterval(()=>{},1000)")) }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  try {
    let st = JSON.parse((await call(port, 'GET', '/api/term')).body);
    assert.strictEqual(st.platform, process.platform);
    assert.strictEqual(st.available, availability().ok);
    assert.strictEqual(st.reason, availability().reason);
    if (!onWin) return;
    assert.strictEqual(st.windowsBuild, windowsBuild(os.release()));
    assert.strictEqual((await call(port, 'POST', '/api/term/start', { cols: 80, rows: 24 })).code, 200);
    const t0 = Date.now(); let text = '';
    while (Date.now() - t0 < 20000 && !/hello-term:/.test(text)) {
      await new Promise(r => setTimeout(r, 300));
      text = await new Promise(res => {
        let d = '';
        const r = http.get({ host: '127.0.0.1', port, path: '/term-events', headers: { Host: 'localhost:' + port } }, resp => {
          resp.on('data', c => { d += c; }); setTimeout(() => { r.destroy(); res(d); }, 300);
        });
        r.on('error', () => res(d));
      }).then(sse => { const l = sse.split('\n').find(x => x.startsWith('data: ')); return l ? plain(Buffer.from(JSON.parse(l.slice(6)).d, 'base64')) : ''; });
    }
    assert.match(text, new RegExp('hello-term:' + hex(fs.realpathSync(path.join(root, 'a'))) + ':', 'i'));
    assert.strictEqual((await call(port, 'POST', '/api/term/stop', {})).code, 200);
  } finally {
    proc.kill();
  }
});

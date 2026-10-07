// Okno Claude jako czat albo terminal, styl z widoku. Kryteria z docs/specs/claude-chat.md (AC-CH1..AC-CH5, zmiana 0.38.0).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const terminal = require('../terminal');

const B = path.join(__dirname, '..');
const TEMPLATES = path.join(B, '..', 'templates', 'requirements');
const read = f => fs.readFileSync(path.join(B, f), 'utf8');
let chat; try { chat = require('../chat'); } catch (e) { chat = null; }
const W = path.win32;

test('AC-CH1: claudeArgv i windowsClaude dopisuja argumenty (cudzyslow dla powloki, argv na Windows)', () => {
  const a = terminal.claudeArgv({ SHELL: '/bin/zsh' }, { resume: true, args: ['-p', '--append-system-prompt', "Styl: BIZ, it's"] });
  assert.deepStrictEqual(a, ['/bin/zsh', '-l', '-c', "exec claude --continue '-p' '--append-system-prompt' 'Styl: BIZ, it'\\''s'"]);
  assert.deepStrictEqual(terminal.claudeArgv({ SHELL: '/bin/bash' }), ['/bin/bash', '-l', '-c', 'exec claude']);
  const fsx = { exists: p => p === W.join('C:\\bin', 'claude.exe'), read: () => '' };
  const w = terminal.windowsClaude({ PATH: 'C:\\bin' }, fsx, { resume: true, args: ['-p', 'a b'] });
  assert.deepStrictEqual(w.argv, [W.join('C:\\bin', 'claude.exe'), '--continue', '-p', 'a b']);
  assert.match(w.line, /claude\.exe" --continue -p "a b"$|claude\.exe --continue -p "a b"$/);
});

test('AC-CH2: chatArgs - tryb wymiany wiadomosci, zgody dontAsk z lista, styl w instrukcji', () => {
  assert.ok(chat, 'brak chat.js');
  const a = chat.chatArgs({ resume: false, style: 'biz' });
  ['-p', '--input-format', 'stream-json', '--output-format', '--verbose', '--permission-mode', 'dontAsk', '--allowedTools', '--append-system-prompt']
    .forEach(f => assert.ok(a.includes(f), f));
  ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Skill', 'Bash(date:*)'].forEach(t => assert.ok(a.includes(t), t));
  assert.ok(!a.some(x => /^Bash$|Bash\(\*\)|Bash\(node/.test(x)), 'bez ogolnego Bash');
  const p = a[a.indexOf('--append-system-prompt') + 1];
  assert.match(p, /stylu BIZ/i);
  assert.match(chat.chatArgs({ style: 'inz' })[chat.chatArgs({ style: 'inz' }).indexOf('--append-system-prompt') + 1], /stylu INZ/i);
  assert.match(chat.STYLE_PROMPT.inz, /terminal/i);
});

test('AC-CH2: parseEvent - tekst, dzialania, odrzucenia, koniec tury, id rozmowy', () => {
  const P = o => chat.parseEvent(JSON.stringify(o));
  assert.deepStrictEqual(P({ type: 'system', subtype: 'init', session_id: 's1' }), [{ kind: 'init', session: 's1' }]);
  assert.deepStrictEqual(P({ type: 'assistant', message: { content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'Czesc' }] } }), [{ kind: 'text', text: 'Czesc' }]);
  assert.deepStrictEqual(P({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: '/a/b/QUESTIONS.md' } }] } }),
    [{ kind: 'tool', name: 'Write', target: 'QUESTIONS.md' }]);
  assert.deepStrictEqual(P({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'curl -s x' } }] } }),
    [{ kind: 'tool', name: 'Bash', target: 'curl -s x' }]);
  assert.deepStrictEqual(P({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: "Permission to use Bash with command curl -s x has been denied." }] } }),
    [{ kind: 'denied', text: "Permission to use Bash with command curl -s x has been denied." }]);
  assert.deepStrictEqual(P({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } }), []);
  assert.deepStrictEqual(P({ type: 'result', subtype: 'success', session_id: 's1' }), [{ kind: 'done', ok: true }]);
  assert.deepStrictEqual(P({ type: 'user', message: 'tekst' }), []);
  assert.strictEqual(chat.parseEvent('nie json'), null);
});

const skip = process.platform === 'win32' ? 'POSIX (sh)' : false;
const FAKE = `process.stdin.setEncoding('utf8');let b='';
console.log(JSON.stringify({type:'system',subtype:'init',session_id:'fake'}));
process.stdin.on('data',c=>{b+=c;let i;while((i=b.indexOf('\\n'))>=0){const l=b.slice(0,i);b=b.slice(i+1);if(!l.trim())continue;
const m=JSON.parse(l);const t=m.message.content;
console.log(JSON.stringify({type:'assistant',message:{content:[{type:'text',text:'echo: '+t}]}}));
console.log(JSON.stringify({type:'assistant',message:{content:[{type:'tool_use',name:'Write',input:{file_path:'/x/'+process.argv.length+'.md'}}]}}));
console.log(JSON.stringify({type:'result',subtype:'success',session_id:'fake'}));}});`;

test('AC-CH2: ChatSession - start, send, dziennik, busy, stop', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-chat-'));
  const fake = path.join(dir, 'fake.js'); fs.writeFileSync(fake, FAKE);
  const s = new chat.ChatSession();
  const ev = []; s.on('event', e => ev.push(e));
  s.start({ cwd: dir, argv: [process.execPath, fake] });
  assert.strictEqual(s.state().running, true);
  s.send('Pytanie 1');
  assert.strictEqual(s.state().busy, true);
  await new Promise(r => { const t = setInterval(() => { if (ev.some(e => e.kind === 'done')) { clearInterval(t); r(); } }, 20); });
  assert.strictEqual(s.state().busy, false);
  const kinds = s.log().map(e => e.kind);
  assert.deepStrictEqual(kinds.filter(k => k !== 'init'), ['start', 'user', 'text', 'tool', 'done']);
  assert.strictEqual(s.log().find(e => e.kind === 'user').text, 'Pytanie 1');
  assert.strictEqual(s.log().find(e => e.kind === 'text').text, 'echo: Pytanie 1');
  s.stop();
  await new Promise(r => { if (!s.state().running) return r(); s.once('exit', r); });
  assert.strictEqual(s.state().running, false);
});

function freePort() { return new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
function call(port, method, url, body, extra) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: Object.assign({ 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' }, extra) }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', rej); if (body !== undefined) r.write(JSON.stringify(body)); r.end();
  });
}
function stream(port, ms) {
  return new Promise(res => { let d = ''; const r = http.get({ host: '127.0.0.1', port, path: '/chat-events', headers: { Host: 'localhost:' + port } }, resp => {
    resp.on('data', c => { d += c; }); setTimeout(() => { r.destroy(); res(d); }, ms); }); r.on('error', () => res(d)); });
}

test('AC-CH3: serwer - /api/chat, start, send, zdarzenia, ochrona, czat konczy terminal', { skip }, async () => {
  const port = await freePort();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-chatsrv-'));
  fs.cpSync(TEMPLATES, path.join(root, 'a', 'requirements'), { recursive: true });
  const fake = path.join(root, 'fake.js'); fs.writeFileSync(fake, FAKE);
  const proc = spawn(process.execPath, [path.join(B, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '', SDD_UPDATE_CHECK: '0',
      SDD_CLAUDE_CMD: process.execPath + ' ' + fake, CLAUDE_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ccfg-')) }) });
  await new Promise((res, rej) => { let o = ''; proc.stdout.on('data', c => { o += c; if (/Panel:/.test(o)) res(); }); proc.on('exit', c => rej(new Error('serwer: ' + c))); });
  try {
    assert.strictEqual((await call(port, 'POST', '/api/chat/start', {}, { 'x-sdd': '' })).code, 403);
    assert.strictEqual((await call(port, 'GET', '/api/chat', undefined, { Host: 'evil.example:' + port })).code, 403);
    assert.strictEqual((await call(port, 'POST', '/demo/api/chat/start', {})).code, 403);
    let st = JSON.parse((await call(port, 'GET', '/api/chat')).body);
    assert.strictEqual(st.running, false);
    assert.strictEqual(typeof st.dictate, 'boolean');
    assert.strictEqual((await call(port, 'POST', '/api/chat/start', {})).code, 200);
    assert.strictEqual((await call(port, 'POST', '/api/chat/send', { text: 'Dzien dobry' })).code, 200);
    await new Promise(r => setTimeout(r, 600));
    const s = await stream(port, 300);
    const first = JSON.parse(s.split('\n').find(l => l.startsWith('data: ')).slice(6));
    assert.strictEqual(first.replay, true);
    assert.ok(first.log.some(e => e.kind === 'text' && e.text === 'echo: Dzien dobry'), JSON.stringify(first.log));
    // terminal startowany po czacie konczy czat tego modulu (jedna rozmowa na modul)
    assert.strictEqual((await call(port, 'POST', '/api/term/start', { cols: 80, rows: 24 })).code, 200);
    await new Promise(r => setTimeout(r, 300));
    st = JSON.parse((await call(port, 'GET', '/api/chat')).body);
    assert.strictEqual(st.running, false);
    await call(port, 'POST', '/api/term/stop', {});
  } finally { proc.kill(); }
});

test('AC-CH3: terminal z panelu startuje ze stylem INZ; serwer koordynuje tryby', () => {
  const srv = read('server.js');
  assert.match(srv, /args: \['--append-system-prompt', chat\.STYLE_PROMPT\.inz\]/);
  assert.match(srv, /chatOf\(termKey\(\)\)\.stop\(\)/);
  assert.match(srv, /term\.cur\.stop\(\)[^\n]*\/\/ jedna rozmowa na modul/);
});

test('AC-CH4: okno Claude - przelacznik czat / terminal, znacznik stylu, widok czatu', () => {
  const ui = read('ui.js'), css = read('ui.css');
  ['cd-view', 'data-view="chat"', 'data-view="code"', 'cd-style', 'cd-chat', 'cd-log', 'cd-input', "prefs.view"].forEach(t => assert.ok(ui.includes(t), t));
  assert.match(ui, /e\.key === 'Enter' && !e\.shiftKey/);
  assert.match(ui, /function chatMd\(/);
  assert.match(css, /\.cdock \.cd-chat\{/);
  assert.match(css, /\.cdock \.m\.u\{/);
  // markdown bez wstrzykiwania HTML
  const ui2 = require('../ui.js');
  assert.strictEqual(ui2.chatMd('**a** <b>x</b>\n- y'), '<p><strong>a</strong> &lt;b&gt;x&lt;/b&gt;</p><ul><li>y</li></ul>');
  assert.strictEqual(ui2.toolSummary([{ kind: 'tool', name: 'Write', target: 'A.md' }, { kind: 'tool', name: 'Edit', target: 'B.md' }, { kind: 'tool', name: 'Read', target: 'C.md' }]),
    'zapisano A.md, B.md · odczyt 1 pliku');
});

test('AC-CH5: skill interview - instrukcja z panelu ma pierwszenstwo przed interview_style', () => {
  const s = fs.readFileSync(path.join(B, '..', 'skills', 'interview', 'SKILL.md'), 'utf8');
  assert.match(s, /okno czatu panelu[^\n]*BIZ[^\n]*terminal panelu[^\n]*INZ|panel sdd-board[^\n]*pierwszenstwo/);
});

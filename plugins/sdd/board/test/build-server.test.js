// "Buduj" - serwer end-to-end (0.44.0, docs/specs/build.md AC-BD4): modul w repo git, udawany Claude przez SDD_CLAUDE_CMD.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-bds-'));
const GCFG = path.join(TMP, 'gitconfig');
fs.writeFileSync(GCFG, '');
const ENV = Object.assign({}, process.env, { GIT_CONFIG_GLOBAL: GCFG, GIT_CONFIG_NOSYSTEM: '1', SDD_COPY_HOST: 'testhost' });
delete ENV.SDD_COPY;
const g = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function freePort() {
  return new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function call(port, method, url, body) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: { 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' } }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d, json: () => JSON.parse(d) }));
    });
    r.on('error', rej);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}
function firstEvent(port, url) {
  return new Promise((res, rej) => {
    const r = http.get({ host: '127.0.0.1', port, path: url, headers: { Host: 'localhost:' + port } }, resp => {
      let d = '';
      resp.on('data', c => { d += c; const m = d.match(/^data: (.*)\n\n/); if (m) { r.destroy(); res(JSON.parse(m[1])); } });
    });
    r.on('error', e => { if (e.code !== 'ECONNRESET') rej(e); });
  });
}
async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) throw new Error('nie doczekano'); await new Promise(r => setTimeout(r, 100)); }
}

const FAKE = `let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{
const out=o=>console.log(JSON.stringify(o));
out({type:'system',subtype:'init',session_id:'fake'});
out({type:'assistant',message:{content:[{type:'tool_use',name:'Bash',input:{command:'pytest'}}]}});
const wait=/CZEKAJ/.test(s);
setTimeout(()=>{ out({type:'assistant',message:{content:[{type:'text',text:'RAPORT '+process.cwd()+' | '+s.split('\\n')[0]}]}});
out({type:'result',subtype:'success',session_id:'fake'}); }, wait ? 4000 : 50);});`;
const skip = process.platform === 'win32';

function events(port, until, ms = 10000) {
  return new Promise((res, rej) => {
    let d = '';
    const r = http.get({ host: '127.0.0.1', port, path: '/build-events', headers: { Host: 'localhost:' + port } }, resp => {
      resp.on('data', c => { d += c; if (until(d)) { r.destroy(); res(d); } });
    });
    r.on('error', e => { if (e.code !== 'ECONNRESET') rej(e); });
    setTimeout(() => { r.destroy(); res(d); }, ms);
  });
}

test('AC-BD4: /api/build - zadania, start w folderze feature, raport w SSE, 409 w trakcie, stop, prompt, demo 403', { skip }, async () => {
  const mod = path.join(TMP, 'app');
  fs.cpSync(TEMPLATES, path.join(mod, 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(mod, 'requirements', '03-spec', 'PRD.md'), '# PRD\n\n## 5. Wymagania\n\n### R-001 Import CSV\nOpis: x\nStatus: zatwierdzone\n');
  g(TMP, 'init', '-q', '-b', 'main', mod);
  g(mod, 'config', 'user.email', 'ala@firma.pl'); g(mod, 'config', 'user.name', 'Ala');
  g(mod, 'add', '-A'); g(mod, 'commit', '-qm', 'start');
  fs.writeFileSync(path.join(TMP, 'config.json'), '{}');
  const fake = path.join(TMP, 'fake.js'); fs.writeFileSync(fake, FAKE);
  const port = await freePort();
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(mod, 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: mod, env: Object.assign({}, ENV, { SDD_CONFIG: path.join(TMP, 'config.json'), SDD_MODULES_ROOT: '', SDD_UPDATE_CHECK: '0',
      SDD_CLAUDE_CMD: process.execPath + ' ' + fake, CLAUDE_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-ccfg-')) }) });
  try {
    await new Promise((res, rej) => {
      let out = '';
      proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
      proc.on('exit', code => rej(new Error('serwer: ' + code + ' ' + out)));
    });
    const b0 = (await call(port, 'GET', '/api/build')).json();
    assert.deepStrictEqual(b0.tasks, [{ id: 'R-001', title: 'Import CSV', status: 'zatwierdzone' }]);
    assert.strictEqual(b0.state.status, 'idle');
    assert.strictEqual(b0.git, true);
    // prompt: domyslny, zapis do pliku modulu, reset
    let p = (await call(port, 'GET', '/api/build/prompt')).json();
    assert.strictEqual(p.custom, false);
    assert.match(p.text, /\{zadanie\}/);
    assert.strictEqual((await call(port, 'PUT', '/api/build/prompt', { text: 'Moj prompt: {zadanie} na {galaz}\nlinia 2' })).code, 200);
    const pf = path.join(mod, 'requirements', 'build-prompt.md');
    assert.strictEqual(fs.readFileSync(pf, 'utf8'), 'Moj prompt: {zadanie} na {galaz}\nlinia 2\n');
    assert.strictEqual((await call(port, 'GET', '/api/build/prompt')).json().custom, true);
    // start: folder obok repo, galaz feature, udawany Claude, raport w SSE
    const st = await call(port, 'POST', '/api/build/start', { task: { id: 'R-001', title: 'Import CSV' } });
    assert.strictEqual(st.code, 200, st.body);
    const folder = path.join(path.dirname(fs.realpathSync(mod)), 'app-build', 'r-001-import-csv');
    assert.strictEqual(st.json().state.branch, 'feature/r-001-import-csv');
    assert.strictEqual(st.json().state.folder, folder);
    const ev = await events(port, d => /"status":"done"/.test(d));
    assert.match(ev, new RegExp('RAPORT ' + folder.replace(/[/\\]/g, '.') + ' \\| Moj prompt: R-001 Import CSV na feature/r-001-import-csv'));
    assert.strictEqual(g(folder, 'symbolic-ref', '--short', 'HEAD'), 'feature/r-001-import-csv');
    assert.strictEqual(g(mod, 'symbolic-ref', '--short', 'HEAD'), 'main', 'repo usera na main');
    const done = (await call(port, 'GET', '/api/build')).json().state;
    assert.strictEqual(done.status, 'done');
    assert.match(done.report, /^RAPORT /);
    // reset promptu -> domyslny; drugi start w trakcie -> 409; stop
    assert.strictEqual((await call(port, 'PUT', '/api/build/prompt', { reset: true })).code, 200);
    assert.ok(!fs.existsSync(pf));
    assert.strictEqual((await call(port, 'PUT', '/api/build/prompt', { text: 'CZEKAJ {zadanie}' })).code, 200);
    assert.strictEqual((await call(port, 'POST', '/api/build/start', { title: 'Popraw ekran' })).code, 200);
    assert.strictEqual((await call(port, 'POST', '/api/build/start', { title: 'Drugie' })).code, 409);
    assert.strictEqual((await call(port, 'POST', '/api/build/stop')).code, 200);
    await events(port, d => /"status":"stopped"/.test(d));
    assert.strictEqual((await call(port, 'GET', '/api/build')).json().state.status, 'stopped');
    // demo
    assert.strictEqual((await call(port, 'POST', '/demo/api/build/start', { title: 'x' })).code, 403);
    assert.strictEqual((await call(port, 'PUT', '/demo/api/build/prompt', { text: 'x' })).code, 403);
  } finally { proc.kill(); }
});

test.after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

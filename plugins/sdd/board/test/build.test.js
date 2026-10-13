// "Buduj" - autonomiczne budowanie na galezi feature (0.44.0, docs/specs/build.md AC-BD1..AC-BD3).
// Prawdziwy git w katalogach tymczasowych, udawany Claude (node) czytajacy prompt ze stdin.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-bd-'));
const GCFG = path.join(TMP, 'gitconfig');
fs.writeFileSync(GCFG, '');
process.env.GIT_CONFIG_GLOBAL = GCFG;
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.SDD_COPY_HOST = 'testhost';
const bd = require('../build');

const g = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let n = 0;
function repo() {
  const dir = path.join(TMP, 'app' + (++n));
  fs.mkdirSync(path.join(dir, 'requirements', '03-spec'), { recursive: true });
  g(TMP, 'init', '-q', '-b', 'main', dir);
  g(dir, 'config', 'user.email', 'jan@firma.pl'); g(dir, 'config', 'user.name', 'Jan');
  fs.writeFileSync(path.join(dir, 'requirements', 'SDD.yaml'), 'project: "x"\n');
  fs.writeFileSync(path.join(dir, 'requirements', '03-spec', 'PRD.md'), 'v1\n');
  fs.writeFileSync(path.join(dir, 'app.py'), 'print(1)\n');
  g(dir, 'add', '-A'); g(dir, 'commit', '-q', '-m', 'start');
  return dir;
}

const PRD = '# PRD\n\n## 5. Wymagania\n\n### R-001 Wpisanie odczytu miesiąca\nOpis: x\nStatus:            zatwierdzone (właściciel, 2026-10-08)\n\n' +
  '### R-002 Import odczytów z CSV - cały plik albo nic\nOpis: y\nStatus: robocze\n\n### R-xxx <tytul>\nStatus: wzor\n\n' +
  '### R-003 Raport roczny\nOpis: z\nStatus: zatwierdzone\n';

test('AC-BD1: branchFor, fillPrompt, DEFAULT_PROMPT, buildArgs, tasksFrom', () => {
  assert.strictEqual(bd.branchFor('R-002', 'Import odczytów z CSV - cały plik albo nic'), 'feature/r-002-import-odczytow-z-csv-caly-plik-albo', 'najwyzej 50 znakow, cale slowa');
  assert.ok(bd.branchFor('R-9', 'x'.repeat(200)).length <= 50);
  assert.strictEqual(bd.branchFor('', 'Popraw ekran logowania'), 'feature/popraw-ekran-logowania');
  assert.strictEqual(bd.fillPrompt('A {zadanie} B {galaz} C {folder} {zadanie}', { zadanie: 'R-1 X', galaz: 'feature/r-1', folder: '/f' }),
    'A R-1 X B feature/r-1 C /f R-1 X');
  const p = bd.DEFAULT_PROMPT;
  ['{zadanie}', '{galaz}', 'TDD', 'AC', 'założenie', 'raport', 'Nie pushujesz', 'typ(zakres): opis', 'CHANGELOG.md', 'nie mockuj'].forEach(w =>
    assert.ok(p.toLowerCase().includes(w.toLowerCase()), w));
  assert.doesNotMatch(p, /czekasz na|zapytaj mnie|pytanie do mnie/i, 'autonomicznie - bez czekania');
  const a = bd.buildArgs();
  assert.deepStrictEqual(a.slice(0, 1), ['-p']);
  ['--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk', '--allowedTools', '--disallowedTools'].forEach(w => assert.ok(a.includes(w), w));
  assert.ok(!a.includes('--dangerously-skip-permissions'));
  const allowed = a.slice(a.indexOf('--allowedTools') + 1, a.indexOf('--disallowedTools'));
  const denied = a.slice(a.indexOf('--disallowedTools') + 1);
  ['Edit', 'Write', 'Bash(git commit:*)', 'Bash(npm:*)', 'Bash(pytest:*)', 'Bash(python3:*)', 'Bash(.venv/bin/python:*)'].forEach(t => assert.ok(allowed.includes(t), t));
  ['Bash(git push:*)', 'Bash(git reset:*)', 'Bash(git checkout:*)', 'Bash(git switch:*)', 'Bash(rm -rf:*)', 'Bash(sudo:*)', 'Bash(curl:*)'].forEach(t => assert.ok(denied.includes(t), t));
  assert.ok(!allowed.some(t => /push|reset|checkout|sudo/.test(t)));
  assert.deepStrictEqual(bd.tasksFrom(PRD), [
    { id: 'R-001', title: 'Wpisanie odczytu miesiąca', status: 'zatwierdzone (właściciel, 2026-10-08)' },
    { id: 'R-003', title: 'Raport roczny', status: 'zatwierdzone' },
    { id: 'R-002', title: 'Import odczytów z CSV - cały plik albo nic', status: 'robocze' },
  ]);
  assert.deepStrictEqual(bd.tasksFrom(''), []);
});

test('AC-BD10: DEFAULT_PROMPT - fazy workflow z CLAUDE.md: A-C budowanie, D-G czlowiek', () => {
  const p = bd.DEFAULT_PROMPT;
  assert.match(p, /workflow z CLAUDE\.md/i);
  assert.match(p, /fazach A–C/);
  assert.match(p, /D–G[^\n]*nie należą do budowania[^\n]*zwykłej sesji z potwierdzeniem właściciela/);
  assert.doesNotMatch(p, /robi człowiek/);
});

test('AC-BD11: DEFAULT_PROMPT - krok 0: instrukcje budowania projektu, brak -> propozycja w raporcie albo stop', () => {
  const p = bd.DEFAULT_PROMPT;
  const k0 = p.split('\n').find(l => /^0\. /.test(l)) || '';
  assert.ok(k0, 'krok 0');
  ['instrukcje budowania', 'CLAUDE.md projektu', 'komendy testów', 'pytest.ini', 'gotowy tekst', 'zatrzymaj się', 'pytania'].forEach(w =>
    assert.ok(k0.includes(w), w));
  assert.ok(p.indexOf('0. ') < p.indexOf('1. Spec'), 'przed spec');
});

test('AC-BD2: prepareWorktree - galaz w folderze obok, repo usera bez zmian, wymagania z dysku, kontynuacja', async () => {
  const dir = repo();
  // niezacommitowane wymagania i nowy plik
  fs.writeFileSync(path.join(dir, 'requirements', '03-spec', 'PRD.md'), 'v2 niezacommitowane\n');
  fs.writeFileSync(path.join(dir, 'requirements', 'nowy.md'), 'nowy\n');
  const head = g(dir, 'rev-parse', 'HEAD'), status = g(dir, 'status', '--porcelain');
  const w = await bd.prepareWorktree(dir, 'feature/r-002-import');
  assert.strictEqual(w.ok, true, w.error);
  assert.strictEqual(w.created, true);
  assert.strictEqual(w.folder, path.join(path.dirname(fs.realpathSync(dir)), path.basename(dir) + '-build', 'r-002-import'));
  assert.strictEqual(g(w.folder, 'symbolic-ref', '--short', 'HEAD'), 'feature/r-002-import');
  assert.strictEqual(fs.readFileSync(path.join(w.folder, 'requirements', '03-spec', 'PRD.md'), 'utf8'), 'v2 niezacommitowane\n');
  assert.strictEqual(fs.readFileSync(path.join(w.folder, 'requirements', 'nowy.md'), 'utf8'), 'nowy\n');
  assert.ok(fs.existsSync(path.join(w.folder, 'app.py')));
  // repo usera nietkniete
  assert.strictEqual(g(dir, 'symbolic-ref', '--short', 'HEAD'), 'main');
  assert.strictEqual(g(dir, 'rev-parse', 'HEAD'), head);
  assert.strictEqual(g(dir, 'status', '--porcelain'), status);
  assert.strictEqual(g(dir, 'diff', '--cached', '--name-only'), '');
  // kontynuacja: ten sam folder, wymagania nie nadpisane
  fs.writeFileSync(path.join(w.folder, 'requirements', '03-spec', 'PRD.md'), 'zmiana na galezi\n');
  const w2 = await bd.prepareWorktree(dir, 'feature/r-002-import');
  assert.strictEqual(w2.ok, true, w2.error);
  assert.strictEqual(w2.created, false);
  assert.strictEqual(w2.folder, w.folder);
  assert.strictEqual(fs.readFileSync(path.join(w.folder, 'requirements', '03-spec', 'PRD.md'), 'utf8'), 'zmiana na galezi\n');
  // obca nazwa galezi
  assert.strictEqual((await bd.prepareWorktree(dir, 'main')).ok, false);
  assert.strictEqual((await bd.prepareWorktree(dir, 'feature/../x')).ok, false);
  // modul bez gita
  const plain = path.join(TMP, 'plain'); fs.mkdirSync(path.join(plain, 'requirements'), { recursive: true });
  assert.match((await bd.prepareWorktree(plain, 'feature/x')).error, /git/i);
});

const FAKE = `let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{
const out=o=>console.log(JSON.stringify(o));
out({type:'system',subtype:'init',session_id:'fake'});
out({type:'assistant',message:{content:[{type:'tool_use',name:'Bash',input:{command:'pytest'}}]}});
out({type:'assistant',message:{content:[{type:'text',text:'pracuje'}]}});
if(/CZEKAJ/.test(s)){ setInterval(()=>{},1000); return; }
out({type:'assistant',message:{content:[{type:'text',text:'RAPORT: '+process.env.SDD_COPY+' '+s.trim().slice(0,20)}]}});
out({type:'result',subtype:'success',session_id:'fake'});});`;

test('AC-BD3: BuildSession - prompt na stdin, przebieg, raport, stop, SDD_COPY=0', async () => {
  const fake = path.join(TMP, 'fake.js'); fs.writeFileSync(fake, FAKE);
  const s = new bd.BuildSession();
  const done = new Promise(r => s.once('exit', r));
  assert.strictEqual(s.start({ cwd: TMP, prompt: 'Budujesz R-001', argv: [process.execPath, fake], task: { id: 'R-001', title: 'X' }, branch: 'feature/r-001-x', folder: TMP }), true);
  assert.strictEqual(s.state().status, 'running');
  assert.strictEqual(s.start({ cwd: TMP, prompt: 'x', argv: [process.execPath, fake] }), false, 'jedno naraz');
  await done;
  const st = s.state();
  assert.strictEqual(st.status, 'done');
  assert.strictEqual(st.branch, 'feature/r-001-x');
  assert.strictEqual(st.report, 'RAPORT: 0 Budujesz R-001');
  assert.ok(s.log().some(e => e.kind === 'tool' && e.target === 'pytest'));
  // stop w trakcie
  const s2 = new bd.BuildSession();
  const ended = new Promise(r => s2.once('exit', r));
  s2.start({ cwd: TMP, prompt: 'CZEKAJ', argv: [process.execPath, fake] });
  await new Promise(r => setTimeout(r, 300));
  s2.stop();
  await ended;
  assert.strictEqual(s2.state().status, 'stopped');
});

// format jak w prawdziwym przebiegu fv-manager R-021 (stream-json Claude Code)
const J = o => JSON.stringify(o);
const USE = (id, name, input) => J({ type: 'assistant', message: { id: 'm' + id, content: [{ type: 'tool_use', id, name, input }] } });
const RES = (id, text) => J({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: true, content: text }] } });
const DENY = 'Permission to use Bash has been denied because Claude Code is running in don\'t ask mode. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial';
const CMD = 'ls src src/services tests templates && wc -l src/main.py && cat pytest.ini && ls -d .venv ../../fv-manager/.venv 2>/dev/null; head -60 CHANGELOG.md';

test('AC-BD7: parseBuildEvent - blokada z komenda, blad narzedzia osobno', () => {
  const tools = new Map();
  assert.deepStrictEqual(bd.parseBuildEvent(USE('t1', 'Bash', { command: CMD }), tools), [{ kind: 'tool', name: 'Bash', target: CMD.slice(0, 120) }]);
  assert.deepStrictEqual(bd.parseBuildEvent(RES('t1', DENY), tools), [{ kind: 'denied', tool: 'Bash', command: CMD }]);
  bd.parseBuildEvent(USE('t2', 'Edit', { file_path: '/x/src/main.py', old_string: 'a', new_string: 'b' }), tools);
  const err = '<tool_use_error>Found 2 matches of the string to replace, but replace_all is false. To replace all occurrences, set replace_all to true.\nString: "pv_stats"</tool_use_error>';
  const e = bd.parseBuildEvent(RES('t2', err), tools);
  assert.strictEqual(e.length, 1);
  assert.strictEqual(e[0].kind, 'toolerr');
  assert.strictEqual(e[0].tool, 'Edit');
  assert.ok(e[0].text.startsWith('Found 2 matches of the string to replace'));
  assert.ok(e[0].text.length <= 160 && !/tool_use_error|\n/.test(e[0].text));
  // odmowa zapisu pliku poza folderem - komenda = plik
  bd.parseBuildEvent(USE('t3', 'Write', { file_path: '/etc/hosts', content: 'x' }), tools);
  assert.deepStrictEqual(bd.parseBuildEvent(RES('t3', 'Permission to use Write has been denied because Claude Code is running in don\'t ask mode.'), tools),
    [{ kind: 'denied', tool: 'Write', command: '/etc/hosts' }]);
  // nieznane id - blokada bez komendy, bez wyjatku
  assert.deepStrictEqual(bd.parseBuildEvent(RES('zz', DENY), tools), [{ kind: 'denied', tool: '', command: '' }]);
  // reszta jak w czacie
  assert.deepStrictEqual(bd.parseBuildEvent(J({ type: 'assistant', message: { content: [{ type: 'text', text: 'Testy sa czerwone.' }] } }), tools), [{ kind: 'text', text: 'Testy sa czerwone.' }]);
  assert.strictEqual(bd.parseBuildEvent('nie json', tools), null);
});

const FAKE2 = `const out=o=>console.log(JSON.stringify(o));process.stdin.resume();process.stdin.on('end',()=>{
out({type:'assistant',message:{content:[{type:'tool_use',id:'a',name:'Bash',input:{command:'curl x'}}]}});
out({type:'user',message:{content:[{type:'tool_result',tool_use_id:'a',is_error:true,content:"Permission to use Bash has been denied because Claude Code is running in don't ask mode."}]}});
out({type:'assistant',message:{content:[{type:'tool_use',id:'b',name:'Bash',input:{command:'curl x'}}]}});
out({type:'user',message:{content:[{type:'tool_result',tool_use_id:'b',is_error:true,content:"Permission to use Bash has been denied because Claude Code is running in don't ask mode."}]}});
out({type:'assistant',message:{content:[{type:'text',text:'Testy czerwone.'}]}});
out({type:'assistant',message:{content:[{type:'text',text:'Testy czerwone.'}]}});
out({type:'assistant',message:{content:[{type:'text',text:'Gotowe.'}]}});
out({type:'result',subtype:'success'});});`;

test('AC-BD8: BuildSession - tekst bez powtorzen, lista zablokowanych komend', async () => {
  const fake = path.join(TMP, 'fake2.js'); fs.writeFileSync(fake, FAKE2);
  const s = new bd.BuildSession();
  const done = new Promise(r => s.once('exit', r));
  s.start({ cwd: TMP, prompt: 'x', argv: [process.execPath, fake] });
  await done;
  assert.deepStrictEqual(s.log().filter(e => e.kind === 'text').map(e => e.text), ['Testy czerwone.', 'Gotowe.']);
  assert.deepStrictEqual(s.state().denied, ['curl x']);
  assert.strictEqual(s.log().filter(e => e.kind === 'denied').length, 2, 'w przebiegu kazda proba');
});

test.after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

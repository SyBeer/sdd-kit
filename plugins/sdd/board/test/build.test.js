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

test('AC-BD1 (AC-021-1, AC-021-2): branchFor, fillPrompt, DEFAULT_PROMPT, buildArgs, tasksFrom', () => {
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

test('AC-BD2 (AC-020-1, AC-020-3): prepareWorktree - galaz w folderze obok, repo usera bez zmian, wymagania z dysku, kontynuacja', async () => {
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

test('AC-BD12 (AC-020-4): alreadyDone - commity z numerem, wersja wydania, inne galezie feature', async () => {
  const dir = repo();
  fs.writeFileSync(path.join(dir, 'a.py'), '1\n'); g(dir, 'add', '-A'); g(dir, 'commit', '-q', '-m', 'feat(dashboard): magazyn (R-021, R-002)');
  g(dir, 'tag', '-a', 'v3.6.0', '-m', 'v3.6.0');
  fs.writeFileSync(path.join(dir, 'b.py'), '1\n'); g(dir, 'add', '-A'); g(dir, 'commit', '-q', '-m', 'fix: R-0210 inne');
  g(dir, 'branch', 'feature/r-021-stara-proba');
  // sam spec z numerem - to nie zrobione wymaganie
  fs.writeFileSync(path.join(dir, 'requirements', '03-spec', 'PRD.md'), 'R-021 nowe\n'); g(dir, 'add', '-A'); g(dir, 'commit', '-q', '-m', 'docs(requirements): spec R-021');
  fs.writeFileSync(path.join(dir, 'requirements', '03-spec', 'PRD.md'), 'R-077\n'); g(dir, 'add', '-A'); g(dir, 'commit', '-q', '-m', 'docs(requirements): R-077');
  assert.deepStrictEqual((await bd.alreadyDone(dir, 'R-077')).commits, [], 'tylko requirements/');
  const a = await bd.alreadyDone(dir, 'R-021');
  assert.deepStrictEqual(a.commits.map(c => c.subject), ['feat(dashboard): magazyn (R-021, R-002)']);
  assert.match(a.commits[0].hash, /^[0-9a-f]{7,}$/);
  assert.ok(a.commits[0].date);
  assert.strictEqual(a.tag, 'v3.6.0');
  assert.strictEqual(a.branch, 'main');
  assert.deepStrictEqual(a.branches, ['feature/r-021-stara-proba']);
  const b = await bd.alreadyDone(dir, 'R-0210');
  assert.deepStrictEqual(b.commits.map(c => c.subject), ['fix: R-0210 inne']);
  assert.strictEqual(b.tag, null, 'jeszcze nie wydane');
  assert.deepStrictEqual(await bd.alreadyDone(dir, 'R-099'), { commits: [], tag: null, branch: 'main', branches: [] });
  assert.deepStrictEqual((await bd.alreadyDone(dir, '')).commits, []);
});

test('AC-BD15: DEFAULT_PROMPT - krok 0 sprawdza, czy wymaganie nie jest juz zrobione', () => {
  const k0 = bd.DEFAULT_PROMPT.split('\n').find(l => /^0\. /.test(l)) || '';
  assert.match(k0, /git log --grep/);
  assert.match(k0, /już zrobione/);
});

const step = n => bd.DEFAULT_PROMPT.split('\n').find(l => l.startsWith(n + '. ')) || '';
// kroki po nazwie, nie po numerze - nowy krok nie psuje testow
const stepNo = re => { const l = bd.DEFAULT_PROMPT.split('\n').find(x => re.test(x)) || ''; return l ? Number(l.split('.')[0]) : -1; };
const named = re => step(stepNo(re));
const TDD = () => named(/^\d+\. TDD:/), REPORT = () => named(/^\d+\. Raport/);

test('AC-BD16 (AC-021-5): DEFAULT_PROMPT - krok 1 czyta pliki dla agenta (constitution, plan, tasks funkcji)', () => {
  const k1 = step(1);
  ['PRD.md', '03-spec/agent/', 'constitution.md', 'plan.md', 'tasks.md'].forEach(w => assert.ok(k1.includes(w), w));
});

test('AC-BD17 (AC-021-6): DEFAULT_PROMPT - nazwa testu zawiera ID kryterium, raport podaje przypisanie', () => {
  assert.match(TDD(), /nazwa[^\n]*testu[^\n]*AC-xxx-n/i);
  assert.match(REPORT(), /AC[^\n]*test/);
});

test('AC-BD18 (AC-021-7): DEFAULT_PROMPT - zadanie bez R-xxx (wlasny opis) oznaczone w raporcie jako poza PRD', () => {
  const p = bd.DEFAULT_PROMPT;
  assert.match(p, /bez numeru R-xxx[^\n]*poza PRD/);
  assert.match(REPORT(), /poza PRD/);
});

test('AC-BD19 (AC-021-8): DEFAULT_PROMPT - zachowanie przy awarii integracji ma osobny test', () => {
  assert.match(TDD(), /Przy awarii[^\n]*osobny test/);
});

test('AC-BD20 (AC-021-9): DEFAULT_PROMPT - plan po specu, przed pierwszym testem; raport pokazuje plan', () => {
  const nPlan = stepNo(/^\d+\. Plan:/), nSpec = stepNo(/^\d+\. Spec:/), nTdd = stepNo(/^\d+\. TDD:/);
  assert.ok(nPlan > nSpec && nPlan < nTdd, `plan (${nPlan}) miedzy specem (${nSpec}) a TDD (${nTdd})`);
  const k = step(nPlan);
  ['przed pierwszym testem', 'każde AC', 'nazwa testu', 'plik', 'kolejność'].forEach(w => assert.ok(k.includes(w), w));
  assert.match(REPORT(), /plan[^\n]*zmiany planu/i);
});

test('AC-BD21 (AC-021-12): DEFAULT_PROMPT - test przed kodem pada na warunku kryterium, nie na bledzie skladni/importu/srodowiska', () => {
  assert.match(TDD(), /pada[^\n]*niespełnionym warunku[^\n]*nie na błędzie składni, importu czy środowiska/);
});

test('AC-BD22 (AC-021-13): DEFAULT_PROMPT - raport pokazuje pierwsze uruchomienie testow: czerwone i powod', () => {
  assert.match(REPORT(), /pierwszego uruchomienia[^\n]*czerwon[^\n]*powód porażki/);
});

test('AC-BD23 (AC-021-14): DEFAULT_PROMPT - AC bez testu wypisane, wymaganie niezrobione', () => {
  assert.match(REPORT(), /AC bez testu[^\n]*niezrobione/);
});

test('AC-BD24 (AC-021-10): DEFAULT_PROMPT - wlasne zasady pracy osoby budujacej, brak -> wbudowane, sprzecznosc -> stop', () => {
  const p = bd.DEFAULT_PROMPT;
  const z = p.split('\n').find(l => /^Zasady pracy:/.test(l)) || '';
  assert.ok(z, 'naglowek "Zasady pracy:"');
  ['własne zasady pracy', 'CLAUDE.md', 'fazach A–C', 'Brak', 'wbudowane', 'spec przed kodem', 'TDD', 'typ(zakres): opis',
    'zatrzymaj się przed kodem', 'sprzeczność', 'z których zasad skorzystać'].forEach(w => assert.ok(z.includes(w), w));
  assert.doesNotMatch(p, /WORKFLOW\.md/, 'bez prywatnego pliku jednej osoby');
  assert.match(REPORT(), /które zasady pracy zastosowa/);
});

test('AC-BD25 (AC-021-11): DEFAULT_PROMPT - wymaganie interfejsu: DESIGN.md przed kodem UI, brak -> w raporcie', () => {
  assert.match(named(/^\d+\. Spec:/), /interfejs[^\n]*DESIGN\.md[^\n]*przed kodem UI[^\n]*stosuj[^\n]*brak DESIGN\.md/i);
  assert.match(REPORT(), /brak DESIGN\.md/);
});

const FAKE = `let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{
const out=o=>console.log(JSON.stringify(o));
out({type:'system',subtype:'init',session_id:'fake'});
out({type:'assistant',message:{content:[{type:'tool_use',name:'Bash',input:{command:'pytest'}}]}});
out({type:'assistant',message:{content:[{type:'text',text:'pracuje'}]}});
if(/CZEKAJ/.test(s)){ setInterval(()=>{},1000); return; }
out({type:'assistant',message:{content:[{type:'text',text:'RAPORT: '+process.env.SDD_COPY+' '+s.trim().slice(0,20)}]}});
out({type:'result',subtype:'success',session_id:'fake'});});`;

test('AC-BD3 (AC-020-2, AC-021-3, AC-021-4): BuildSession - prompt na stdin, przebieg, raport, stop, SDD_COPY=0', async () => {
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

test('AC-BD27 (AC-020-5): gateFrom - raport walidacji, odcisk, gotowosc, pytania blokujace z prawdziwego modulu', () => {
  const { readProgress } = require('../progress');
  const { fingerprint } = require('../fingerprint');
  const req = path.join(TMP, 'gate', 'requirements');
  fs.cpSync(path.join(__dirname, '..', '..', 'templates', 'requirements'), req, { recursive: true });
  // modul bez raportu walidacji
  assert.deepStrictEqual(bd.gateFrom(readProgress(req)), { report: false, stale: false, readiness: null, blocking: [] });
  // pytanie z etykieta blokujaca + raport 80% z aktualnym odciskiem
  fs.appendFileSync(path.join(req, '01-interview', 'QUESTIONS.md'),
    '| Q-001 | Co z pustym plikiem? | otwarte (blokuje go-live) | właściciel procesu | luka | R-001 | |\n' +
    '| Q-002 | Jaki format daty? | otwarte | właściciel procesu | luka | R-001 | |\n');
  const rep = path.join(req, '04-validation', 'validate-2026-11-17.md');
  fs.writeFileSync(rep, '# Raport\n\nGotowosc: 80% (4/5 R)\nOdcisk wymagan: ' + fingerprint(req) + '\n');
  assert.deepStrictEqual(bd.gateFrom(readProgress(req)), { report: true, stale: false, readiness: 80, blocking: ['Q-001'] });
  // zmiana wymagan po walidacji -> raport nieaktualny
  fs.appendFileSync(path.join(req, '03-spec', 'PRD.md'), '\nzmiana po walidacji\n');
  assert.strictEqual(bd.gateFrom(readProgress(req)).stale, true);
  assert.deepStrictEqual(bd.gateFrom({ exists: false }), { report: false, stale: false, readiness: null, blocking: [] });
});

const REPORT_TXT ='Raport R-001\n\n## Commity\n- abc1234 feat(import): plik CSV cały albo nic (R-001)\n\n' +
  '## Pokrycie\n| AC | test |\n|---|---|\n| AC-001-1 | test_AC_001_1_caly_plik |\n\n## Przyjęte założenia\n- pusty plik = błąd, nie sukces';
const FAKE3 = `process.stdin.resume();process.stdin.on('end',()=>{const out=o=>console.log(JSON.stringify(o));
out({type:'assistant',message:{content:[{type:'text',text:'pracuje'}]}});
out({type:'assistant',message:{content:[{type:'text',text:${JSON.stringify(REPORT_TXT)}}]}});
out({type:'result',subtype:'success'});});`;

test('AC-BD26 (AC-021-3): raport z commitami, AC -> test i zalozeniami - caly w stanie i na stronie /build', async () => {
  const fake = path.join(TMP, 'fake3.js'); fs.writeFileSync(fake, FAKE3);
  const s = new bd.BuildSession();
  const done = new Promise(r => s.once('exit', r));
  s.start({ cwd: TMP, prompt: 'x', argv: [process.execPath, fake] });
  await done;
  assert.strictEqual(s.state().report, REPORT_TXT, 'caly raport, nie fragment');
  const ui = require('../ui.js');
  const h = ui.chatMd(s.state().report);
  ['abc1234', 'feat(import)', '<table', 'AC-001-1', 'test_AC_001_1_caly_plik', 'Przyjęte założenia', 'pusty plik = błąd'].forEach(w =>
    assert.ok(h.includes(w), w));
  const info = fs.readFileSync(path.join(__dirname, '..', 'info.html'), 'utf8');
  assert.match(info, /#breport[^\n]*\.bb[^\n]*SddUI\.chatMd\(s\.report\)|\$\('#breport'\)[^\n]*SddUI\.chatMd\(s\.report\)/);
});

// format jak w prawdziwym przebiegu fv-manager R-021 (stream-json Claude Code)
const J = o => JSON.stringify(o);
const USE = (id, name, input) => J({ type: 'assistant', message: { id: 'm' + id, content: [{ type: 'tool_use', id, name, input }] } });
const RES = (id, text) => J({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: true, content: text }] } });
const DENY = 'Permission to use Bash has been denied because Claude Code is running in don\'t ask mode. IMPORTANT: You *may* attempt to accomplish this action using other tools that might naturally be used to accomplish this goal, e.g. using head instead of cat. But you *should not* attempt to work around this denial';
const CMD = 'ls src src/services tests templates && wc -l src/main.py && cat pytest.ini && ls -d .venv ../../fv-manager/.venv 2>/dev/null; head -60 CHANGELOG.md';

test('AC-BD7 (AC-021-1): parseBuildEvent - blokada z komenda, blad narzedzia osobno', () => {
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

test('AC-BD8 (AC-021-1): BuildSession - tekst bez powtorzen, lista zablokowanych komend', async () => {
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

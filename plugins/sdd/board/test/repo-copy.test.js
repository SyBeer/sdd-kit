// Kopia wymagan w repozytorium i zapisane wersje (0.41.0, docs/specs/repo-copy.md AC-RC1..AC-RC9).
// Prawdziwy git w katalogach tymczasowych, "origin" = lokalne repo --bare, izolowana konfiguracja gita.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-rc-'));
const GCFG = path.join(TMP, 'gitconfig');
fs.writeFileSync(GCFG, '');
process.env.GIT_CONFIG_GLOBAL = GCFG;
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.SDD_COPY_HOST = 'Mac-Tomka.local';
delete process.env.GIT_SSH_COMMAND;
const rc = require('../repo-copy');

let n = 0;
const g = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function repo(opts = {}) {
  const dir = path.join(TMP, 'm' + (++n));
  const mod = opts.sub ? path.join(dir, opts.sub) : dir;
  fs.mkdirSync(path.join(mod, 'requirements', '00-intake'), { recursive: true });
  g(dir.replace(/\/m\d+$/, ''), 'init', '-q', '-b', 'main', dir);
  if (opts.email !== null) g(dir, 'config', 'user.email', opts.email || 'Jan.Kowalski@firma.pl');
  g(dir, 'config', 'user.name', 'Jan');
  fs.writeFileSync(path.join(mod, 'requirements', 'SDD.yaml'), 'project: "x"\nbacklog: none\n');
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(1)\n');
  if (opts.commit !== false) { g(dir, 'add', '-A'); g(dir, '-c', 'user.email=t@t', 'commit', '-q', '-m', 'start'); }
  return { dir, mod };
}
function bare() {
  const dir = path.join(TMP, 'origin' + (++n) + '.git');
  g(TMP, 'init', '-q', '--bare', dir);
  return dir;
}
const treeFiles = (dir, ref) => g(dir, 'ls-tree', '-r', '--name-only', ref).split('\n').filter(Boolean).sort();

test('AC-RC1: repoState - korzen, sciezka, login, komputer, galaz kopii; bez gita git:false', async () => {
  const { dir, mod } = repo({ sub: 'moduly/Faktury Łódź' });
  g(dir, 'remote', 'add', 'origin', 'https://gitlab.example/x.git');
  const s = await rc.repoState(mod);
  assert.strictEqual(s.git, true);
  assert.strictEqual(s.root, fs.realpathSync(dir));
  assert.strictEqual(s.rel, 'moduly/Faktury Łódź');
  assert.strictEqual(s.branch, 'main');
  assert.strictEqual(s.origin, 'https://gitlab.example/x.git');
  assert.strictEqual(s.login, 'jan-kowalski');
  assert.strictEqual(s.host, 'mac-tomka');
  assert.strictEqual(s.copyBranch, 'sdd-kopia/jan-kowalski/mac-tomka/moduly-faktury-lodz');
  const root = repo({ email: null });
  const r = await rc.repoState(root.mod);
  assert.strictEqual(r.login, 'sdd');
  assert.strictEqual(r.rel, '');
  assert.strictEqual(r.copyBranch, 'sdd-kopia/sdd/mac-tomka/' + path.basename(root.dir));
  assert.strictEqual(r.origin, null);
  const plain = path.join(TMP, 'plain'); fs.mkdirSync(plain);
  assert.strictEqual((await rc.repoState(plain)).git, false);
});

test('AC-RC2: makeCopy - tylko requirements/, stan roboczy nietkniety, bez zmian bez commitu, rodzic, HEAD nie ma wplywu', async () => {
  const { dir, mod } = repo({ sub: 'mod' });
  fs.writeFileSync(path.join(dir, '.gitignore'), 'mod/requirements/tmp-*\n');
  fs.writeFileSync(path.join(mod, 'requirements', '00-intake', 'mail.txt'), 'od klienta');  // niesledzony
  fs.writeFileSync(path.join(mod, 'requirements', 'tmp-x.md'), 'ignorowany');
  fs.writeFileSync(path.join(dir, 'app.js'), 'zmiana kodu w toku\n');
  const head = g(dir, 'rev-parse', 'HEAD'), status = g(dir, 'status', '--porcelain'), index = g(dir, 'ls-files', '-s');
  const a = await rc.makeCopy(mod);
  assert.strictEqual(a.changed, true);
  const st = await rc.repoState(mod);
  assert.strictEqual(g(dir, 'rev-parse', 'refs/heads/' + st.copyBranch), a.commit);
  assert.deepStrictEqual(treeFiles(dir, a.commit), ['mod/requirements/00-intake/mail.txt', 'mod/requirements/SDD.yaml']);
  assert.strictEqual(g(dir, 'rev-parse', 'HEAD'), head);
  assert.strictEqual(g(dir, 'status', '--porcelain'), status);
  assert.strictEqual(g(dir, 'ls-files', '-s'), index);
  assert.strictEqual(g(dir, 'symbolic-ref', '--short', 'HEAD'), 'main');
  const b = await rc.makeCopy(mod);
  assert.deepStrictEqual([b.changed, b.commit], [false, a.commit]);
  // commit kodu na main nie tworzy nowej kopii
  g(dir, 'commit', '-qam', 'kod');
  assert.strictEqual((await rc.makeCopy(mod)).changed, false);
  fs.appendFileSync(path.join(mod, 'requirements', 'SDD.yaml'), 'kind: service\n');
  const c = await rc.makeCopy(mod);
  assert.strictEqual(c.changed, true);
  assert.strictEqual(g(dir, 'rev-parse', c.commit + '^'), a.commit);
  // repo bez commitow
  const e = repo({ commit: false });
  const d = await rc.makeCopy(e.mod);
  assert.strictEqual(d.changed, true);
  assert.deepStrictEqual(treeFiles(e.dir, d.commit), ['requirements/SDD.yaml']);
  assert.throws(() => g(e.dir, 'rev-parse', '--verify', '-q', 'HEAD'));
});

test('AC-RC3: plik > maxBytes pominiety i zwrocony w skipped', async () => {
  const { dir, mod } = repo();
  fs.writeFileSync(path.join(mod, 'requirements', '00-intake', 'wielki.pdf'), Buffer.alloc(2048));
  fs.writeFileSync(path.join(mod, 'requirements', '00-intake', 'maly.txt'), 'x');
  const r = await rc.makeCopy(mod, { maxBytes: 1024 });
  assert.deepStrictEqual(r.skipped.map(s => s.file), ['requirements/00-intake/wielki.pdf']);
  assert.strictEqual(r.skipped[0].size, 2048);
  assert.ok(!treeFiles(dir, r.commit).includes('requirements/00-intake/wielki.pdf'));
  assert.ok(treeFiles(dir, r.commit).includes('requirements/00-intake/maly.txt'));
  assert.strictEqual(rc.MAX_BYTES, 10 * 1024 * 1024);
});

test('AC-RC4: dwa moduly w jednym repo - osobne galezie, kopia jednego nie rusza drugiego', async () => {
  const { dir, mod } = repo({ sub: 'a' });
  const modB = path.join(dir, 'b');
  fs.mkdirSync(path.join(modB, 'requirements'), { recursive: true });
  fs.writeFileSync(path.join(modB, 'requirements', 'SDD.yaml'), 'project: "b"\n');
  const ka = await rc.makeCopy(mod), kb = await rc.makeCopy(modB);
  const sa = await rc.repoState(mod), sb = await rc.repoState(modB);
  assert.notStrictEqual(sa.copyBranch, sb.copyBranch);
  assert.deepStrictEqual(treeFiles(dir, ka.commit), ['a/requirements/SDD.yaml']);
  assert.deepStrictEqual(treeFiles(dir, kb.commit), ['b/requirements/SDD.yaml']);
  assert.strictEqual(g(dir, 'rev-parse', 'refs/heads/' + sa.copyBranch), ka.commit);
});

test('AC-RC5: pushCopy - sukces, brak origin, nieosiagalny serwer, bez pytan, bez obcych tagow', async () => {
  const { dir, mod } = repo();
  assert.match((await rc.pushCopy(mod)).error, /adresu serwera|origin/);
  const o = bare();
  g(dir, 'remote', 'add', 'origin', o);
  g(dir, 'tag', 'prywatny');
  await rc.makeCopy(mod);
  const st = await rc.repoState(mod);
  const r = await rc.pushCopy(mod);
  assert.deepStrictEqual(r, { ok: true, error: '' });
  assert.strictEqual(g(o, 'rev-parse', 'refs/heads/' + st.copyBranch), g(dir, 'rev-parse', 'refs/heads/' + st.copyBranch));
  assert.strictEqual(g(o, 'tag', '-l'), '');
  assert.strictEqual(g(o, 'branch', '--list', 'main'), '');
  // nieosiagalny serwer
  g(dir, 'remote', 'set-url', 'origin', path.join(TMP, 'nie-ma-takiego.git'));
  const bad = await rc.pushCopy(mod);
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error.length > 0 && bad.error.length <= 300);
  assert.doesNotMatch(bad.error, /^hint:/m);
  const env = rc.gitEnv({});
  assert.strictEqual(env.GIT_TERMINAL_PROMPT, '0');
  assert.strictEqual(env.GCM_INTERACTIVE, 'never');
  assert.match(env.GIT_SSH_COMMAND, /BatchMode=yes/);
  assert.strictEqual(rc.gitEnv({ GIT_SSH_COMMAND: 'ssh -i k' }).GIT_SSH_COMMAND, 'ssh -i k');
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'repo-copy.js'), 'utf8'), /'--force'|'-f'|--force-with-lease|'\+refs/);
});

test('AC-RC6: copyStatus - nogit, local, noorigin, ok, unsent', async () => {
  const plain = path.join(TMP, 'plain2'); fs.mkdirSync(plain);
  assert.strictEqual((await rc.copyStatus(plain, 'remote')).state, 'nogit');
  const { dir, mod } = repo();
  await rc.makeCopy(mod);
  const loc = await rc.copyStatus(mod, 'local');
  assert.strictEqual(loc.state, 'local');
  assert.ok(Date.parse(loc.at) > 0);
  assert.strictEqual((await rc.copyStatus(mod, 'remote')).state, 'noorigin');
  g(dir, 'remote', 'add', 'origin', bare());
  assert.strictEqual((await rc.copyStatus(mod, 'remote')).state, 'unsent');
  await rc.pushCopy(mod);
  assert.strictEqual((await rc.copyStatus(mod, 'remote')).state, 'ok');
  assert.deepStrictEqual(await rc.copyStatus(mod, 'remote', 'timeout'), Object.assign(await rc.copyStatus(mod, 'remote'), { state: 'unsent', error: 'timeout' }));
  fs.appendFileSync(path.join(mod, 'requirements', 'SDD.yaml'), '# x\n');
  await rc.makeCopy(mod);
  assert.strictEqual((await rc.copyStatus(mod, 'remote')).state, 'unsent');
  await rc.pushCopy(mod);
  await rc.makeVersion(mod, 'dla biznesu', { push: false, now: new Date(2026, 9, 10, 12) });
  assert.strictEqual((await rc.copyStatus(mod, 'remote')).state, 'unsent');
});

test('AC-RC7: slug, makeVersion, listVersions', async () => {
  assert.strictEqual(rc.slug('  Wersja pokazana biznesowi 10.10 – Łódź!  '), 'wersja-pokazana-biznesowi-10-10-lodz');
  assert.strictEqual(rc.slug('a'.repeat(60)).length, 40);
  const { dir, mod } = repo();
  const o = bare();
  g(dir, 'remote', 'add', 'origin', o);
  const st = await rc.repoState(mod);
  assert.match((await rc.makeVersion(mod, '!!!')).error, /nazw/i);
  const v1 = await rc.makeVersion(mod, 'Pokazane biznesowi', { push: false, now: new Date(2026, 9, 10, 9) });
  assert.strictEqual(v1.ok, true);
  assert.strictEqual(v1.tag, 'sdd-wersja/' + st.module + '/2026-10-10-pokazane-biznesowi');
  assert.strictEqual(v1.sent, false);
  assert.strictEqual(g(dir, 'rev-parse', v1.tag + '^{commit}'), g(dir, 'rev-parse', 'refs/heads/' + st.copyBranch));
  assert.match((await rc.makeVersion(mod, 'Pokazane biznesowi', { now: new Date(2026, 9, 10, 10) })).error, /już jest/);
  fs.appendFileSync(path.join(mod, 'requirements', 'SDD.yaml'), '# y\n');
  const v2 = await rc.makeVersion(mod, 'po warsztacie', { push: true, now: new Date(2026, 9, 10, 15) });
  assert.deepStrictEqual([v2.ok, v2.sent], [true, true]);
  assert.deepStrictEqual(g(o, 'tag', '-l').split('\n').sort(), [v2.tag, v1.tag].sort());  // wyslane obie
  const list = await rc.listVersions(mod);
  assert.deepStrictEqual(list.map(v => [v.name, v.sent]), [['po warsztacie', true], ['Pokazane biznesowi', true]]);
  assert.ok(Date.parse(list[0].at) > Date.parse(list[1].at));
  g(dir, 'tag', 'sdd-wersja/inny-modul/2026-10-10-x');
  assert.strictEqual((await rc.listVersions(mod)).length, 2);
});

test('AC-RC8: createCopier - debounce, laczenie, kolejka, tryb local, blad wysylki', async () => {
  const { dir, mod } = repo();
  const o = bare();
  g(dir, 'remote', 'add', 'origin', o);
  let mode = 'local', changes = 0;
  const c = rc.createCopier(mod, { delayMs: 80, mode: () => mode, onChange: () => { changes++; } });
  const st = await rc.repoState(mod);
  c.touch(); c.touch(); c.touch();
  await new Promise(r => setTimeout(r, 30));
  assert.throws(() => g(dir, 'rev-parse', '--verify', '-q', 'refs/heads/' + st.copyBranch));  // jeszcze cisza
  await new Promise(r => setTimeout(r, 120)); await c.idle();
  const first = g(dir, 'rev-parse', 'refs/heads/' + st.copyBranch);
  assert.strictEqual(changes, 1);
  assert.strictEqual(spawnSync('git', ['--git-dir', o, 'rev-parse', '--verify', '-q', 'refs/heads/' + st.copyBranch]).status, 1);  // local - bez wysylki
  assert.strictEqual(c.status().state, 'local');
  // now() w trakcie -> jedno nastepne przejscie
  mode = 'remote';
  c.now(); c.now(); c.now();
  await c.idle();
  assert.ok(changes <= 3 && changes >= 2, 'przejscia: ' + changes);
  assert.strictEqual(c.status().state, 'ok');
  assert.strictEqual(g(o, 'rev-parse', 'refs/heads/' + st.copyBranch), first);
  const v = await c.version('kolejka');
  assert.strictEqual(v.ok, true);
  // blad wysylki
  g(dir, 'remote', 'set-url', 'origin', path.join(TMP, 'brak.git'));
  fs.appendFileSync(path.join(mod, 'requirements', 'SDD.yaml'), '# z\n');
  c.now(); await c.idle();
  assert.strictEqual(c.status().state, 'unsent');
  assert.ok(c.status().error);
  c.stop();
});

test('AC-RC9: hook konca sesji robi kopie w module z gitem (remote - wysyla), poza modulem nic, kod 0', () => {
  const { dir, mod } = repo();
  const o = bare();
  g(dir, 'remote', 'add', 'origin', o);
  fs.writeFileSync(path.join(mod, 'requirements', 'SDD.yaml'), 'project: "x"\nbacklog: none\ncopy: remote\n');
  const hook = path.join(__dirname, '..', 'session-mark.js');
  const env = Object.assign({}, process.env, { SDD_SESSIONS_DIR: path.join(TMP, 'sess') });
  const r = spawnSync(process.execPath, [hook, 'end'], { input: JSON.stringify({ session_id: 'abc', cwd: mod }), env, encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  const branch = g(dir, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/sdd-kopia/');
  assert.match(branch, /^sdd-kopia\/jan-kowalski\/mac-tomka\//);
  assert.strictEqual(g(o, 'rev-parse', 'refs/heads/' + branch), g(dir, 'rev-parse', 'refs/heads/' + branch));
  const plain = path.join(TMP, 'plain3'); fs.mkdirSync(plain);
  assert.strictEqual(spawnSync(process.execPath, [hook, 'end'], { input: JSON.stringify({ session_id: 'abd', cwd: plain }), env }).status, 0);
  assert.strictEqual(spawnSync(process.execPath, [hook, 'end'], { input: 'nie json', env }).status, 0);
});

test.after(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

'use strict';
// "Buduj" (0.44.0, docs/specs/build.md): autonomiczne budowanie zadania z PRD na galezi feature, w osobnym folderze
// (git worktree obok repozytorium). Claude Code w tle (-p, stream-json, dontAsk) z lista dozwolonych i zablokowanych
// komend - bez pytan o zgode i bez --dangerously-skip-permissions. Repo usera (galaz, pliki, indeks) bez zmian.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const terminal = require('./terminal');
const rc = require('./repo-copy');
const { parseEvent } = require('./chat');
const { entries } = require('./req-changes');

const BUILD_ALLOWED = ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'MultiEdit', 'TodoWrite', 'Task', 'Skill',
  // testy i budowanie
  'Bash(npm:*)', 'Bash(npx:*)', 'Bash(node:*)', 'Bash(pnpm:*)', 'Bash(yarn:*)',
  'Bash(python:*)', 'Bash(python3:*)', 'Bash(pytest:*)', 'Bash(pip:*)', 'Bash(pip3:*)',
  'Bash(.venv/bin/python:*)', 'Bash(.venv/bin/pytest:*)', 'Bash(.venv/bin/pip:*)', 'Bash(./.venv/bin/python:*)', 'Bash(./.venv/bin/pytest:*)',
  'Bash(make:*)', 'Bash(go:*)', 'Bash(cargo:*)', 'Bash(mvn:*)', 'Bash(gradle:*)', 'Bash(./gradlew:*)', 'Bash(dotnet:*)',
  // git na galezi budowania
  'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)',
  // odczyt i pliki
  'Bash(ls:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)', 'Bash(grep:*)', 'Bash(find:*)',
  'Bash(mkdir:*)', 'Bash(date:*)', 'Bash(cd:*)'];
const BUILD_DENIED = ['Bash(git push:*)', 'Bash(git reset:*)', 'Bash(git checkout:*)', 'Bash(git switch:*)',
  'Bash(git rebase:*)', 'Bash(git merge:*)', 'Bash(git branch:*)', 'Bash(git worktree:*)', 'Bash(git clean:*)',
  'Bash(rm -rf:*)', 'Bash(sudo:*)', 'Bash(curl:*)', 'Bash(wget:*)'];

const DEFAULT_PROMPT = [
  'Budujesz autonomicznie: {zadanie}. Gałąź: {galaz}, folder: {folder}.',
  'Nikt nie odpowiada na pytania w trakcie - pracujesz sam do końca i kończysz raportem. Metoda: SDD + TDD.',
  'Workflow z CLAUDE.md (WORKFLOW.md) stosujesz w fazach A–C: spec już jest (czytasz go, nie piszesz od nowa), build z TDD, commit. Fazy D–G (build+SBOM, wydanie, tag, push, weryfikacja) nie należą do budowania - robi się je po przeglądzie, w zwykłej sesji z potwierdzeniem właściciela.',
  '',
  '0. Najpierw instrukcje budowania: sprawdź, czy workflow z CLAUDE.md i CLAUDE.md projektu mówią, jak przygotować środowisko i jakie są komendy testów i buildu tego projektu. Są - stosuj je. Brak, ale wynikają jednoznacznie z repo (np. pytest.ini, package.json) - buduj dalej, a w raporcie daj gotowy tekst do dopisania do CLAUDE.md projektu. Brak i nie da się ich ustalić - zatrzymaj się przed kodem, a w raporcie zaproponuj instrukcje i zadaj pytania.',
  '1. Spec: przeczytaj {wymagania}/03-spec/PRD.md (to wymaganie i jego kryteria AC), reguły BR i decyzje D, na które się powołuje, oraz CLAUDE.md projektu. Spec jest źródłem prawdy.',
  '2. Środowisko: jeśli brakuje zależności (np. .venv, node_modules), przygotuj je komendami projektu.',
  '3. TDD: najpierw testy wyprowadzone z kryteriów AC - uruchom, mają nie przechodzić. Potem kod, aż przejdą. Potem refaktor. Na końcu cały zestaw testów projektu na zielono. Nie mockuj prawdziwych API.',
  '4. Niejasność w specu: wybierz najostrożniejszy wariant, zapisz go jako założenie w raporcie i buduj dalej. Gdy bez decyzji biznesu nie da się iść dalej - zatrzymaj się i opisz to w raporcie.',
  '5. Kod rozjeżdża się ze specem: nie zmieniaj speca sam - opisz rozjazd w raporcie.',
  '6. Commity małe, format typ(zakres): opis, z numerem wymagania w treści. Wpis w CHANGELOG.md, jeśli projekt go ma. Nie pushujesz, nie zmieniasz gałęzi, nie scalasz.',
  '7. Komenda zablokowana: nie obchodź blokady - zapisz w raporcie, czego zabrakło.',
  '8. Raport na koniec: co zrobione, commity, które AC pokrywa który test, wynik testów, przyjęte założenia, czego nie zrobiono i dlaczego.',
].join('\n');

// slug jak w kopii, ale bez limitu 40 znakow - skracany nizej do pelnego slowa
function slug(s) {
  return String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function branchFor(id, title) {
  let s = slug([id, title].filter(Boolean).join(' '));
  if (s.length > 42) s = s.slice(0, 43).replace(/-[^-]*$/, '') || s.slice(0, 42);
  return 'feature/' + (s || 'zadanie');
}
const BRANCH = /^feature\/[a-z0-9][a-z0-9-]{0,48}$/;
function fillPrompt(t, v) {
  return String(t || '').replace(/\{(zadanie|galaz|folder|wymagania)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m));
}
// Wymagania R z PRD: zatwierdzone pierwsze, w kolejnosci pliku; wzor R-xxx pominiety
function tasksFrom(prd) {
  const list = entries(prd).filter(e => /^R-\d+$/.test(e.key))
    .map(e => ({ id: e.key, title: e.title, status: e.fields.get('Status') || '' }));
  const ok = t => /^zatwierdz/i.test(t.status);
  return list.filter(ok).concat(list.filter(t => !ok(t)));
}
function buildArgs() {
  return ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk',
    '--allowedTools'].concat(BUILD_ALLOWED, ['--disallowedTools'], BUILD_DENIED);
}

// Folder budowania: <repo>-build/<slug> obok repozytorium, galaz feature/<slug> (AC-BD2)
async function prepareWorktree(dir, branch) {
  if (!BRANCH.test(String(branch || ''))) return { ok: false, error: 'Nazwa gałęzi musi mieć postać feature/<nazwa>.' };
  const st = await rc.repoState(dir);
  if (!st.git) return { ok: false, error: 'Moduł nie jest repozytorium git - budowanie wymaga gita.' };
  const name = branch.slice('feature/'.length);
  const folder = path.join(path.dirname(st.root), path.basename(st.root) + '-build', name);
  const wl = await rc.git(st.root, ['worktree', 'list', '--porcelain']);
  let at = null;
  wl.out.split('\n\n').forEach(b => {
    const p = (b.match(/^worktree (.*)$/m) || [])[1], br = (b.match(/^branch (.*)$/m) || [])[1];
    if (p && br === 'refs/heads/' + branch) at = p;
  });
  if (at) return { ok: true, created: false, folder: at, branch, root: st.root };
  if (fs.existsSync(folder)) return { ok: false, error: 'Folder ' + folder + ' już istnieje i nie jest gałęzią ' + branch + '.' };
  fs.mkdirSync(path.dirname(folder), { recursive: true });
  const exists = await rc.tipOf(st.root, 'refs/heads/' + branch);
  const add = await rc.git(st.root, ['worktree', 'add'].concat(exists ? [folder, branch] : ['-b', branch, folder, 'HEAD']));
  if (add.code) return { ok: false, error: (add.err || '').trim().split('\n').pop() || 'Nie udało się założyć folderu budowania.' };
  if (exists) return { ok: true, created: false, folder, branch, root: st.root };
  // nowa galaz: wymagania jak dzis na dysku (ostatnia kopia, takze niezacommitowane) - tylko pliki robocze
  const c = await rc.makeCopy(dir);
  let warning = '';
  if (c.commit) {
    const req = (st.rel ? st.rel + '/' : '') + 'requirements';
    const r = await rc.git(folder, ['restore', '--source=' + c.commit, '--worktree', '--overlay', '--', req]);
    if (r.code) warning = 'Wymagania z ostatniego commita - nie udało się dołożyć dzisiejszych zmian.';
  } else warning = 'Wymagania z ostatniego commita - brak kopii dzisiejszych zmian.';
  return { ok: true, created: true, folder, branch, root: st.root, warning };
}

// Zdarzenie przebiegu (0.44.1, AC-BD7): wynik narzedzia laczony z wywolaniem po tool_use_id - odmowa uprawnien
// pokazuje komende, zwykly blad narzedzia (np. Edit: tekst 2 razy w pliku) jest osobnym rodzajem, nie "zablokowane"
const DENIED_RE = /Permission to use \S+ (?:has been )?denied|don't ask mode/i;
function parseBuildEvent(line, tools) {
  const base = parseEvent(line);
  if (base === null) return null;
  const e = JSON.parse(line);
  const c = e && e.message && Array.isArray(e.message.content) ? e.message.content : [];
  if (e.type === 'assistant') c.forEach(b => {
    if (!b || b.type !== 'tool_use' || !b.id) return;
    const i = b.input || {};
    tools.set(b.id, { name: String(b.name || ''), command: String(i.command || i.file_path || i.path || i.notebook_path || i.pattern || '').slice(0, 300) });
  });
  if (e.type !== 'user') return base;
  const out = base.filter(x => x.kind !== 'denied');
  c.forEach(b => {
    if (!b || b.type !== 'tool_result' || !b.is_error) return;
    const t = Array.isArray(b.content) ? b.content.map(x => x && x.text || '').join(' ') : String(b.content || '');
    const u = tools.get(b.tool_use_id) || { name: '', command: '' };
    if (DENIED_RE.test(t)) out.push({ kind: 'denied', tool: u.name, command: u.command });
    else out.push({ kind: 'toolerr', tool: u.name, text: t.replace(/<\/?tool_use_error>/g, '').trim().split('\n')[0].slice(0, 160) });
  });
  return out;
}

// Przebieg budowania (AC-BD3): prompt na stdin, zdarzenia z parseEvent, raport = ostatni tekst Claude
const LOG_MAX = 1500;
class BuildSession extends EventEmitter {
  constructor() { super(); this.proc = null; this.entries = []; this.info = { status: 'idle', denied: [] }; this.stopping = false; this.lastText = null; }
  state() { return Object.assign({ running: !!this.proc }, this.info); }
  log() { return this.entries.slice(); }
  add(ev) {
    // ten sam tekst drugi raz z rzedu (strumien potrafi powtorzyc wiadomosc) - raz (AC-BD8)
    if (ev.kind === 'text') { if (ev.text === this.lastText) return; this.lastText = ev.text; }
    this.entries.push(ev);
    if (this.entries.length > LOG_MAX) this.entries.splice(0, this.entries.length - LOG_MAX);
    if (ev.kind === 'text') this.info.report = ev.text;
    if (ev.kind === 'denied' && ev.command && !this.info.denied.includes(ev.command)) this.info.denied.push(ev.command);
    this.emit('event', ev);
  }
  // o: {cwd, prompt, task, branch, folder, env} albo {..., argv} (testy)
  start(o) {
    if (this.proc) return false;
    const env = Object.assign(terminal.childEnv(o.env || process.env), { SDD_COPY: '0' });
    const spawnOpts = { cwd: o.cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true };
    let p;
    if (o.argv) p = spawn(o.argv[0], o.argv.slice(1), spawnOpts);
    else if (process.platform === 'win32') {
      const w = terminal.windowsClaude(o.env || process.env, null, { args: buildArgs() });
      p = w.argv ? spawn(w.argv[0], w.argv.slice(1), spawnOpts) : spawn(w.line, Object.assign({ shell: true }, spawnOpts));
    } else {
      const a = terminal.claudeArgv(o.env || process.env, { args: buildArgs() });
      p = spawn(a[0], a.slice(1), Object.assign({}, spawnOpts, { detached: true }));
    }
    this.proc = p; this.entries = []; this.stopping = false; this.lastText = null;
    const tools = new Map();
    this.info = { status: 'running', task: o.task || null, branch: o.branch || '', folder: o.folder || o.cwd, startedAt: new Date().toISOString(),
      endedAt: null, exitCode: null, report: '', ok: null, denied: [] };
    this.add({ kind: 'start', task: o.task || null, branch: o.branch || '' });
    let buf = '', err = '';
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', c => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        (parseBuildEvent(line, tools) || []).forEach(ev => { if (ev.kind === 'done') this.info.ok = ev.ok; this.add(ev); });
      }
    });
    p.stderr.on('data', c => { err = (err + c).slice(-2000); });
    p.stdin.on('error', () => {});
    p.on('error', e => this.add({ kind: 'error', text: e.message }));
    p.on('close', code => {
      if (this.proc !== p) return;
      this.proc = null;
      this.info.exitCode = code; this.info.endedAt = new Date().toISOString();
      this.info.status = this.stopping ? 'stopped' : (code === 0 && this.info.ok !== false ? 'done' : 'error');
      if (this.info.status === 'error' && err.trim()) this.add({ kind: 'error', text: err.trim().split('\n').slice(-3).join('\n') });
      this.add({ kind: 'exit', code, status: this.info.status });
      this.emit('exit', code);
    });
    p.stdin.end(String(o.prompt || ''));
    return true;
  }
  stop() {
    if (!this.proc) return false;
    this.stopping = true;
    // cala grupa procesow (powloka logowania + claude + jego komendy)
    try { if (process.platform !== 'win32' && this.proc.spawnargs[0] !== process.execPath) process.kill(-this.proc.pid, 'SIGTERM'); else this.proc.kill('SIGTERM'); }
    catch (e) { try { this.proc.kill('SIGTERM'); } catch (e2) { /* juz zakonczony */ } }
    return true;
  }
}

module.exports = { parseBuildEvent, BUILD_ALLOWED, BUILD_DENIED, DEFAULT_PROMPT, branchFor, fillPrompt, tasksFrom, buildArgs, prepareWorktree, BuildSession };

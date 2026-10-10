'use strict';
// Kopia wymagan w repozytorium i zapisane wersje (0.41.0, docs/specs/repo-copy.md).
// Praca w requirements/ kopiowana automatycznie na osobna galaz sdd-kopia/<login>/<komputer>/<modul> - przez
// tymczasowy indeks, wiec HEAD, indeks, pliki robocze i main zostaja bez zmian. W drzewie kopii tylko requirements/
// modulu. Tryb remote wysyla kopie do origin (bez --force, bez pytan o haslo, limit 30 s). Wersja = tag z adnotacja.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const reqChanges = require('./req-changes');

const MAX_BYTES = 10 * 1024 * 1024;   // wieksze pliki (zwykle surowe zalaczniki) nie trafiaja do kopii
const PUSH_TIMEOUT = 30000;
const FALLBACK = { name: 'sdd-kit', email: 'sdd-kit@localhost' };

// Srodowisko gita bez zadnych pytan: terminal, Git Credential Manager, SSH (haslo klucza, nowy host)
function gitEnv(base) {
  const e = Object.assign({}, base, { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' });
  if (!e.GIT_SSH_COMMAND) e.GIT_SSH_COMMAND = 'ssh -o BatchMode=yes';
  return e;
}
function git(cwd, args, o = {}) {
  return new Promise(resolve => {
    execFile('git', args, { cwd, env: o.env || process.env, timeout: o.timeout || 0, windowsHide: true,
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, (err, out, errOut) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: String(out || ''),
        err: String(errOut || '') + (err && err.killed ? '\nPrzekroczony czas ' + Math.round((o.timeout || 0) / 1000) + ' s.' : ''),
        failed: !!err && typeof err.code !== 'number' && !err.killed ? String(err.message || err) : '' });
    });
  });
}
const line = r => r.out.trim();

function slug(name) {
  return String(name || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
}
function realpath(p) { try { return fs.realpathSync(p); } catch (e) { return path.resolve(p); } }

async function repoState(dir) {
  const none = { git: false, root: null, rel: null, branch: null, origin: null, login: null, host: null, module: null, copyBranch: null };
  if (!fs.existsSync(dir)) return none;
  const top = await git(dir, ['rev-parse', '--show-toplevel']);
  if (top.code) return none;
  const root = realpath(line(top));
  const rel = path.relative(root, realpath(dir)).split(path.sep).join('/');
  const [br, or, em] = await Promise.all([git(root, ['symbolic-ref', '--short', '-q', 'HEAD']),
    git(root, ['remote', 'get-url', 'origin']), git(root, ['config', 'user.email'])]);
  const login = slug(line(em).split('@')[0]) || 'sdd';
  const host = slug(String(process.env.SDD_COPY_HOST || os.hostname()).split('.')[0]) || 'komputer';
  const module = slug(rel) || slug(path.basename(root)) || 'modul';
  return { git: true, root, rel, branch: br.code ? null : line(br) || null, origin: or.code ? null : line(or) || null,
    login, host, module, copyBranch: 'sdd-kopia/' + login + '/' + host + '/' + module };
}

// Autor commitu kopii i wersji: z gita, a gdy git go nie zna - sdd-kit (commit-tree i tag nie moga sie wywrocic)
async function identityEnv(root, base) {
  const [n, e] = await Promise.all([git(root, ['config', 'user.name']), git(root, ['config', 'user.email'])]);
  const env = Object.assign({}, base);
  if (!line(n)) { env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || FALLBACK.name; env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || FALLBACK.name; }
  if (!line(e)) { env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || FALLBACK.email; env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || FALLBACK.email; }
  return env;
}
async function tipOf(root, ref) {
  const r = await git(root, ['rev-parse', '-q', '--verify', ref]);
  return r.code ? null : line(r);
}

// Jedna kopia: drzewo z samym requirements/ modulu; bez zmian - bez commitu (AC-RC2..AC-RC4)
async function makeCopy(dir, o = {}) {
  const st = await repoState(dir);
  if (!st.git) return { changed: false, commit: null, skipped: [], error: 'Moduł nie jest repozytorium git.' };
  const max = o.maxBytes || MAX_BYTES;
  const req = (st.rel ? st.rel + '/' : '') + 'requirements';
  const ref = 'refs/heads/' + st.copyBranch;
  for (let attempt = 0; attempt < 2; attempt++) {
    const idx = path.join(os.tmpdir(), 'sdd-kopia-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.idx');
    const env = Object.assign({}, process.env, { GIT_INDEX_FILE: idx });
    try {
      let r = await git(st.root, ['read-tree', '--empty'], { env });
      if (!r.code) r = await git(st.root, ['add', '-A', '--', req], { env });
      if (r.code) return { changed: false, commit: null, skipped: [], error: clean(r.err) || 'Nie udało się zebrać plików requirements/.' };
      const ls = await git(st.root, ['ls-files', '-z', '--cached', '--', req], { env });
      const skipped = [];
      ls.out.split('\0').filter(Boolean).forEach(f => {
        let size = 0;
        try { size = fs.statSync(path.join(st.root, f)).size; } catch (e) { size = 0; }
        if (size > max) skipped.push({ file: st.rel ? f.slice(st.rel.length + 1) : f, size, path: f });
      });
      if (skipped.length) await git(st.root, ['update-index', '--force-remove', '--'].concat(skipped.map(s => s.path)), { env });
      skipped.forEach(s => { delete s.path; });
      const tree = line(await git(st.root, ['write-tree'], { env }));
      const tip = await tipOf(st.root, ref);
      if (tip && (await tipOf(st.root, tip + '^{tree}')) === tree) return { changed: false, commit: tip, skipped };
      const cenv = await identityEnv(st.root, process.env);
      const c = await git(st.root, ['commit-tree', tree].concat(tip ? ['-p', tip] : [], ['-m', 'sdd: kopia ' + new Date().toISOString()]), { env: cenv });
      if (c.code) return { changed: false, commit: tip, skipped, error: clean(c.err) };
      const commit = line(c);
      // z poprzednia wartoscia: rownolegla kopia (hook konca sesji i serwer) nie nadpisze cudzej - wtedy jeszcze raz
      const u = await git(st.root, ['update-ref', ref, commit, tip || '']);
      if (!u.code) return { changed: true, commit, skipped };
      if (attempt === 1) return { changed: false, commit: tip, skipped, error: clean(u.err) };
    } finally {
      fs.rmSync(idx, { force: true }); fs.rmSync(idx + '.lock', { force: true });
    }
  }
  return { changed: false, commit: null, skipped: [], error: 'Nie udało się zapisać kopii.' };
}

// Ostatnie sensowne linie bledu gita (bez "hint:"), najwyzej 300 znakow
function clean(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^hint:/i.test(l));
  return lines.slice(-3).join(' ').slice(0, 300);
}

const versionPrefix = st => 'refs/tags/sdd-wersja/' + st.module + '/';
async function versionRefs(st) {
  const [tags, sent] = await Promise.all([
    git(st.root, ['for-each-ref', '--sort=-creatordate', '--format=%(refname)%09%(objectname)%09%(creatordate:iso-strict)%09%(contents:subject)', versionPrefix(st)]),
    git(st.root, ['for-each-ref', '--format=%(refname)%09%(objectname)', 'refs/sdd-sent/tags/sdd-wersja/' + st.module + '/'])]);
  const sentMap = {};
  line(sent).split('\n').filter(Boolean).forEach(l => { const [r, o] = l.split('\t'); sentMap[r.replace(/^refs\/sdd-sent\//, 'refs/')] = o; });
  return line(tags).split('\n').filter(Boolean).map(l => {
    const [ref, obj, at, name] = l.split('\t');
    return { ref, tag: ref.replace(/^refs\/tags\//, ''), obj, at, name: name || '', sent: sentMap[ref] === obj };
  });
}

// Wysylka kopii i niewyslanych wersji tego modulu (AC-RC5); nigdy inne tagi, nigdy --force
async function pushCopy(dir) {
  const st = await repoState(dir);
  if (!st.git) return { ok: false, error: 'Moduł nie jest repozytorium git.' };
  if (!st.origin) return { ok: false, error: 'Brak adresu serwera (origin) - git remote add origin <adres>.' };
  const ref = 'refs/heads/' + st.copyBranch;
  const tip = await tipOf(st.root, ref);
  if (!tip) return { ok: false, error: 'Nie ma jeszcze kopii do wysłania.' };
  const tags = (await versionRefs(st)).filter(v => !v.sent);
  const r = await git(st.root, ['push', 'origin', ref + ':' + ref].concat(tags.map(v => v.ref + ':' + v.ref)),
    { env: gitEnv(process.env), timeout: PUSH_TIMEOUT });
  if (r.code) return { ok: false, error: clean(r.err) || clean(r.failed) || 'Wysyłka nie powiodła się.' };
  // co wyslano - w ukrytych refach, zeby stan przetrwal restart serwera
  await git(st.root, ['update-ref', 'refs/sdd-sent/heads/' + st.copyBranch, tip]);
  for (const v of tags) await git(st.root, ['update-ref', 'refs/sdd-sent/tags/' + v.tag, v.obj]);
  return { ok: true, error: '' };
}

// Stan kopii liczony z gita (AC-RC6): nogit | local | noorigin | ok | unsent
async function copyStatus(dir, mode, lastError) {
  const st = await repoState(dir);
  if (!st.git) return { state: 'nogit', at: null, branch: null, origin: null, error: '' };
  const tip = await tipOf(st.root, 'refs/heads/' + st.copyBranch);
  const at = tip ? line(await git(st.root, ['log', '-1', '--format=%cI', tip])) || null : null;
  const out = { state: 'local', at, branch: st.copyBranch, origin: st.origin, error: lastError || '' };
  if (mode !== 'remote') return out;
  if (!st.origin) return Object.assign(out, { state: 'noorigin' });
  const sent = await tipOf(st.root, 'refs/sdd-sent/heads/' + st.copyBranch);
  const unsentTags = (await versionRefs(st)).some(v => !v.sent);
  return Object.assign(out, { state: !lastError && tip && sent === tip && !unsentTags ? 'ok' : 'unsent' });
}

function localDate(d) {
  const z = v => (v < 10 ? '0' : '') + v;
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
// Zapisana wersja: kopia + tag z adnotacja sdd-wersja/<modul>/<data>-<slug> (AC-RC7)
async function makeVersion(dir, name, o = {}) {
  const s = slug(name);
  if (!s) return { ok: false, error: 'Podaj nazwę wersji (litery albo cyfry).' };
  const st = await repoState(dir);
  if (!st.git) return { ok: false, error: 'Moduł nie jest repozytorium git.' };
  const now = o.now || new Date();
  const date = localDate(now);
  const tag = 'sdd-wersja/' + st.module + '/' + date + '-' + s;
  if (await tipOf(st.root, 'refs/tags/' + tag)) return { ok: false, error: 'Wersja „' + String(name).trim() + '” z ' + date + ' już jest - wybierz inną nazwę.' };
  const c = await makeCopy(dir, o);
  if (!c.commit) return { ok: false, error: c.error || 'Nie udało się zrobić kopii.' };
  const env = await identityEnv(st.root, Object.assign({}, process.env, { GIT_COMMITTER_DATE: now.toISOString() }));
  const t = await git(st.root, ['tag', '-a', tag, c.commit, '-m', String(name).trim()], { env });
  if (t.code) return { ok: false, error: clean(t.err) };
  if (!o.push) return { ok: true, tag, sent: false, error: '' };
  const p = await pushCopy(dir);
  return { ok: true, tag, sent: p.ok, error: p.error };
}
async function listVersions(dir) {
  const st = await repoState(dir);
  if (!st.git) return [];
  return (await versionRefs(st)).map(v => ({ tag: v.tag, name: v.name, at: v.at, sent: v.sent }));
}

// ---------------------------------------------------------------- Pokaz zmiany / Przywroc (0.42.0, docs/specs/version-restore.md)
const PATCH_FILE = 60 * 1024, PATCH_ALL = 300 * 1024;
const reqPath = st => (st.rel ? st.rel + '/' : '') + 'requirements';
// Tylko wersje tego modulu, ktore istnieja - nazwa z zewnatrz (API) nie moze wskazac dowolnego refa
async function ownVersion(st, tag) {
  const t = String(tag || '');
  const ok = t.startsWith('sdd-wersja/' + st.module + '/') && !/\.\.|[\s~^:?*[\\]/.test(t) && await tipOf(st.root, 'refs/tags/' + t);
  if (!ok) return null;
  const v = (await versionRefs(st)).find(x => x.tag === t);
  return { tag: t, name: v ? v.name : t };
}
const NO_VERSION = { ok: false, error: 'Nie ma takiej wersji tego modułu.' };

// Puste drzewo (pierwsza kopia - wszystko dodane); przez tymczasowy indeks, bez stdin i bez stalej SHA-1
async function emptyTree(root) {
  const idx = path.join(os.tmpdir(), 'sdd-pusty-' + process.pid + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.idx');
  const env = Object.assign({}, process.env, { GIT_INDEX_FILE: idx });
  try {
    await git(root, ['read-tree', '--empty'], { env });
    return line(await git(root, ['write-tree'], { env }));
  } finally { fs.rmSync(idx, { force: true }); }
}
// Porownanie dwoch stanow requirements/ (from -> to); from = null -> puste drzewo (wszystko dodane)
async function diffTrees(st, from, to) {
  const req = reqPath(st);
  if (!from) from = await emptyTree(st.root);
  const base = ['-c', 'core.quotePath=false', 'diff', '--no-renames', '--no-color', from, to];
  const [ns, num, pt] = await Promise.all([git(st.root, base.concat(['--name-status', '--', req])),
    git(st.root, base.concat(['--numstat', '--', req])), git(st.root, base.concat(['-U3', '--', req]))]);
  if (ns.code || num.code || pt.code) return { error: clean(ns.err || num.err || pt.err) || 'Nie udało się porównać.' };
  const short = f => f.slice(req.length + 1);
  const counts = {};
  line(num).split('\n').filter(Boolean).forEach(l => { const [a, d, f] = l.split('\t'); counts[f] = { a, d }; });
  const patches = {};
  ('\n' + pt.out).split(/\ndiff --git /).slice(1).forEach(chunk => {
    const m = chunk.match(/^a\/(.*?) b\/\1\n/) || chunk.match(/^a\/(.*?) b\//);
    if (!m) return;
    const at = chunk.indexOf('\n@@');
    patches[m[1]] = at < 0 ? '' : chunk.slice(at + 1).replace(/\n$/, '');
  });
  const STATUS = { M: 'changed', A: 'added', D: 'removed' };
  let total = 0, truncated = false;
  const files = line(ns).split('\n').filter(Boolean).map(l => {
    const [code, f] = l.split('\t');
    const cnt = counts[f] || { a: '0', d: '0' }, binary = cnt.a === '-';
    let patch = binary ? '' : (patches[f] || '');
    if (patch.length > PATCH_FILE || total + patch.length > PATCH_ALL) { patch = patch.slice(0, Math.max(0, Math.min(PATCH_FILE, PATCH_ALL - total))).replace(/\n[^\n]*$/, ''); truncated = true; }
    total += patch.length;
    return { file: short(f), status: STATUS[code[0]] || 'changed', adds: binary ? 0 : +cnt.a, dels: binary ? 0 : +cnt.d, patch, binary };
  });
  // "Co się zmieniło w wymaganiach" (docs/specs/version-summary.md AC-VS4): tresc przed i po, porownanie po kluczach
  const show = async (ref, f) => { const r = await git(st.root, ['show', ref + ':' + req + '/' + f]); return r.code ? '' : r.out; };
  const summary = await Promise.all(files.map(async f => {
    const known = f.file.endsWith('board.json') || /\.md$/i.test(f.file);
    const [a, b] = known && !f.binary ? await Promise.all([f.status === 'added' ? '' : show(from, f.file), f.status === 'removed' ? '' : show(to, f.file)]) : ['', ''];
    return reqChanges.fileChanges(f.file, a, b, f.status);
  }));
  return { files, truncated, summary };
}

// "Pokaz zmiany" (AC-VR1, AC-VR8): files = od wersji do dzis (pliki na dysku - przez swieza kopie, takze niesledzone),
// news = co nowego w tej wersji (wzgledem poprzedniej wersji; najstarsza - poprzedniej kopii; pierwsza kopia - od zera)
async function versionDiff(dir, tag, o = {}) {
  const st = await repoState(dir);
  if (!st.git) return { ok: false, error: 'Moduł nie jest repozytorium git.' };
  const v = await ownVersion(st, tag);
  if (!v) return NO_VERSION;
  const c = await makeCopy(dir, o);
  if (!c.commit) return { ok: false, error: c.error || 'Nie udało się zrobić kopii.' };
  const refs = await versionRefs(st), i = refs.findIndex(x => x.tag === v.tag), prev = refs[i + 1];
  let base = { kind: 'none', name: '' }, from = null;
  if (prev) { base = { kind: 'version', name: prev.name }; from = prev.tag; }
  else {
    const parent = await tipOf(st.root, v.tag + '^{commit}^');
    if (parent) { base = { kind: 'copy', name: '' }; from = parent; }
  }
  const [since, news] = await Promise.all([diffTrees(st, v.tag, c.commit), diffTrees(st, from, v.tag)]);
  if (since.error || news.error) return { ok: false, error: since.error || news.error };
  return { ok: true, version: v, files: since.files, truncated: since.truncated, summary: since.summary,
    news: { base, files: news.files, truncated: news.truncated, summary: news.summary } };
}

// Pliki w requirements/ z drzewa wersji (sciezki wzgledem korzenia repo)
async function treeList(st, ref) {
  const r = await git(st.root, ['ls-tree', '-r', '-z', '--name-only', ref, '--', reqPath(st)]);
  return r.code ? null : r.out.split('\0').filter(Boolean);
}
const hhmm = (d, sec) => [d.getHours(), d.getMinutes()].concat(sec ? [d.getSeconds()] : []).map(v => (v < 10 ? '0' : '') + v).join(':');

// Przywrocenie calego requirements/ do wersji; najpierw wersja bezpieczenstwa z obecnym stanem; tylko pliki
// robocze (git restore --worktree) - HEAD, main i indeks bez zmian; usuwane tylko pliki, ktore sa w wersji bezpieczenstwa (AC-VR2)
async function restoreVersion(dir, tag, o = {}) {
  const st = await repoState(dir);
  if (!st.git) return { ok: false, error: 'Moduł nie jest repozytorium git.' };
  const v = await ownVersion(st, tag);
  if (!v) return NO_VERSION;
  const now = o.now || new Date();
  let name = 'przed przywróceniem ' + v.name + ' ' + hhmm(now);
  let before = await makeVersion(dir, name, Object.assign({}, o, { now }));
  if (!before.ok && /już jest/.test(before.error || '')) {
    name = 'przed przywróceniem ' + v.name + ' ' + hhmm(now, true);
    before = await makeVersion(dir, name, Object.assign({}, o, { now }));
  }
  if (!before.ok) return { ok: false, error: 'Nie udało się zapisać obecnego stanu przed przywróceniem: ' + before.error };
  const [cur, ver] = await Promise.all([treeList(st, before.tag), treeList(st, v.tag)]);
  if (!cur || !ver) return { ok: false, error: 'Nie udało się odczytać plików wersji.' };
  const keep = new Set(ver), gone = cur.filter(f => !keep.has(f));
  const reqAbs = path.join(st.root, reqPath(st));
  gone.forEach(f => {
    const abs = path.join(st.root, f);
    fs.rmSync(abs, { force: true });
    // puste foldery po usunietych plikach - w gore, najdalej do requirements/
    for (let d = path.dirname(abs); d.startsWith(reqAbs + path.sep); d = path.dirname(d)) {
      try { fs.rmdirSync(d); } catch (e) { break; }
    }
  });
  // tylko pliki robocze (indeks bez zmian); --overlay: git niczego sam nie usuwa - usuwanie wyzej, z lista z kopii
  const r = await git(st.root, ['restore', '--source=' + v.tag, '--worktree', '--overlay', '--', reqPath(st)]);
  if (r.code) return { ok: false, error: clean(r.err) || 'Nie udało się przywrócić plików.', before: { tag: before.tag, name } };
  return { ok: true, before: { tag: before.tag, name, sent: before.sent, error: before.error || '' }, restored: ver.length, removed: gone.length };
}

// Tryb kopii z tresci SDD.yaml: copy: remote | local (brak = local)
function copyMode(yaml) {
  const m = String(yaml || '').match(/^copy:\s*"?([a-z]+)"?/m);
  return m && m[1] === 'remote' ? 'remote' : 'local';
}

// Jedno przejscie: kopia, a w trybie remote z adresem - wysylka, gdy kopia sie zmienila albo stan nie jest ok
async function copyOnce(dir, mode, lastError) {
  try {
    const c = await makeCopy(dir);
    if (c.error && !c.commit) return { changed: false, commit: null, skipped: c.skipped || [], error: c.error };
    let error = c.error || '';
    if (mode === 'remote' && (await repoState(dir)).origin) {
      if (c.changed || (await copyStatus(dir, mode, lastError)).state !== 'ok') error = (await pushCopy(dir)).error || error;
    }
    return { changed: c.changed, commit: c.commit, skipped: c.skipped, error };
  } catch (e) { return { changed: false, commit: null, skipped: [], error: String(e && e.message || e) }; }
}

// Kopista modulu w serwerze (AC-RC8): touch = po ciszy, now = od razu (wywolania w trakcie lacza sie w jedno), kolejka
function createCopier(dir, o = {}) {
  const delay = o.delayMs || 120000, mode = o.mode || (() => 'local');
  let chain = Promise.resolve(), pending = null, timer = null, stopped = false;
  let lastError = '', status = null, skipped = [];
  const enqueue = fn => (chain = chain.then(fn, fn));
  async function refresh() {
    status = await copyStatus(dir, mode(), lastError);
    if (o.onChange) try { o.onChange(status); } catch (e) { /* widok - bez wplywu na kopie */ }
  }
  function now() {
    clearTimeout(timer);
    if (stopped) return chain;
    if (pending) return pending;
    pending = enqueue(async () => {
      pending = null;
      const r = await copyOnce(dir, mode(), lastError);
      lastError = r.error || ''; skipped = r.skipped || [];
      await refresh();
    });
    return pending;
  }
  return {
    touch() { if (stopped) return; clearTimeout(timer); timer = setTimeout(now, delay); },
    now,
    version(name) {
      return enqueue(async () => {
        const remote = mode() === 'remote' && !!(await repoState(dir)).origin;
        const r = await makeVersion(dir, name, { push: remote });
        if (r.ok && remote) lastError = r.error || '';
        await refresh();
        return r;
      });
    },
    diff: tag => enqueue(() => versionDiff(dir, tag)),
    restore(tag) {
      return enqueue(async () => {
        const remote = mode() === 'remote' && !!(await repoState(dir)).origin;
        const r = await restoreVersion(dir, tag, { push: remote });
        if (r.ok && remote) lastError = r.before.error || '';
        await refresh();
        return r;
      });
    },
    status: () => status,
    skipped: () => skipped,
    refresh: () => enqueue(refresh),
    idle: () => chain,
    stop() { stopped = true; clearTimeout(timer); },
  };
}

module.exports = { MAX_BYTES, gitEnv, slug, repoState, makeCopy, pushCopy, copyStatus, makeVersion, listVersions,
  copyMode, copyOnce, createCopier, versionDiff, restoreVersion };

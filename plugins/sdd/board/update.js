// Sprawdzanie i instalacja nowej wersji kitu z GitHuba (spec: docs/specs/update.md, zmiana 0.27.0).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const MARKET = 'sdd-kit';
const RELEASES = 'https://api.github.com/repos/SyBeer/sdd-kit/releases/latest';
const TTL = 6 * 3600 * 1000;
const INSTALL_HINT = 'Kit jest w folderze bez Git (np. z ZIP-a) - zaktualizuj go instalatorem: macOS ' +
  '`curl -fsSL https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.sh | bash`, Windows ' +
  '`irm https://raw.githubusercontent.com/SyBeer/sdd-kit/main/install.ps1 | iex`.';

function parse(v) {
  const m = String(v || '').trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  return m ? m.slice(1).map(Number) : null;
}
// Czy `latest` jest nowsza od `current` (AC-UP1). Zle albo puste -> false.
function newer(latest, current) {
  const a = parse(latest), b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

function knownFile(env) {
  env = env || process.env;
  return env.SDD_KNOWN_MARKETPLACES ||
    path.join(env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'plugins', 'known_marketplaces.json');
}
// Skad Claude Code bierze kit (AC-UP2).
function marketSource(file) {
  let d;
  try { d = JSON.parse(fs.readFileSync(file || knownFile(), 'utf8')); } catch (e) { return null; }
  const s = d && d[MARKET] && d[MARKET].source;
  if (!s) return null;
  if (s.source === 'directory' && s.path) return { type: 'directory', path: s.path };
  if (s.source === 'github' && s.repo) return { type: 'github', repo: s.repo };
  if (s.source === 'git' && s.url) return { type: 'git', url: s.url };
  return null;
}

// Stan repozytorium Git w folderze kitu (AC-UP4). Repo tylko wtedy, gdy folder jest jego korzeniem -
// folder wewnatrz innego repo (np. kopia pluginu w ~/.claude) nie jest kitem z Git.
function gitState(dir) {
  const top = spawnSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  let same = false;
  try { same = top.status === 0 && fs.realpathSync(top.stdout.trim()) === fs.realpathSync(dir); } catch (e) { same = false; }
  if (!same) return { isRepo: false, clean: false };
  const r = spawnSync('git', ['-C', dir, 'status', '--porcelain'], { encoding: 'utf8' });
  return { isRepo: true, clean: r.status === 0 && r.stdout.trim() === '' };
}

// Kroki aktualizacji albo powod, dla ktorego z panelu sie nie da (AC-UP3).
// src - skad Claude Code bierze kit; git - stan src.path; kit - folder, z ktorego dziala panel, i jego stan.
function updatePlan(src, git, kit) {
  const claude = [['claude', 'plugin', 'marketplace', 'update', MARKET], ['claude', 'plugin', 'update', 'sdd@' + MARKET]];
  if (!src) return { error: 'sdd-kit nie jest zainstalowany jako dodatek Claude Code - uruchom instalator (README).' };
  const pulls = [];
  if (src.type === 'directory') {
    if (!git || !git.isRepo) return { error: INSTALL_HINT };
    if (!git.clean) return { error: dirty(src.path) };
    pulls.push(src.path);
  }
  // panel z innego folderu z Git (np. ~/.sdd-kit przy kicie z GitHuba) - tez trzeba go pobrac
  if (kit && kit.dir && kit.state && kit.state.isRepo && pulls.indexOf(kit.dir) < 0 && !(src.path && same(src.path, kit.dir))) {
    if (!kit.state.clean) return { error: dirty(kit.dir) };
    pulls.push(kit.dir);
  }
  return { steps: pulls.map(d => ['git', '-C', d, 'pull', '--ff-only']).concat(claude) };
}
function dirty(dir) {
  return 'W folderze kitu (' + dir + ') są niezapisane zmiany - aktualizacja by je nadpisała. ' +
    'Zapisz je (git commit) albo zaktualizuj ręcznie: git pull.';
}
function same(a, b) { try { return fs.realpathSync(a) === fs.realpathSync(b); } catch (e) { return path.resolve(a) === path.resolve(b); } }

// claude: Windows przez cmd (claude.cmd / .exe), reszta przez powloke logowania (PATH z Homebrew, bez aliasow).
function command(step, env) {
  if (step[0] !== 'claude') return { cmd: step[0], args: step.slice(1), opts: {} };
  const args = step.slice(1);
  if (env.SDD_CLAUDE_BIN) {
    return process.platform === 'win32'
      ? { cmd: 'cmd.exe', args: ['/d', '/s', '/c', '"' + env.SDD_CLAUDE_BIN + '" ' + args.join(' ')], opts: { windowsVerbatimArguments: true } }
      : { cmd: env.SDD_CLAUDE_BIN, args, opts: {} };
  }
  if (process.platform === 'win32') return { cmd: 'cmd.exe', args: ['/d', '/s', '/c', 'claude ' + args.join(' ')], opts: { windowsVerbatimArguments: true } };
  return { cmd: env.SHELL || '/bin/zsh', args: ['-l', '-c', 'exec claude "$@"', 'claude'].concat(args), opts: {} };
}

function runStep(step, env) {
  return new Promise(res => {
    const c = command(step, env);
    let out = '';
    let p;
    try { p = spawn(c.cmd, c.args, Object.assign({ env, stdio: ['ignore', 'pipe', 'pipe'] }, c.opts)); }
    catch (e) { return res({ cmd: step.join(' '), code: -1, output: e.message }); }
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('error', e => { out += e.message; });
    p.on('close', code => res({ cmd: step.join(' '), code, output: out.trim() }));
  });
}
// Kroki po kolei, stop na pierwszym bledzie (AC-UP5).
async function runPlan(steps, env) {
  env = Object.assign({}, env || process.env);
  Object.keys(env).forEach(k => { if (/^(CLAUDECODE|CLAUDE_CODE_)/.test(k)) delete env[k]; });
  const log = [];
  for (const s of steps) {
    const r = await runStep(s, env);
    log.push(r);
    if (r.code !== 0) return { ok: false, log };
  }
  return { ok: true, log };
}

// Najnowsza wersja z GitHuba, pamietana 6 h (AC-UP6). Bledy sieci -> null, bez wyjatku.
function createChecker(o) {
  o = o || {};
  const url = o.url || RELEASES;
  let cache = null, at = 0, pending = null;
  async function fetchLatest() {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'sdd-kit' }, signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) return null;
      const j = await r.json();
      const v = parse(j.tag_name);
      return v ? { version: v.join('.'), url: j.html_url || '' } : null;
    } catch (e) { return null; }
  }
  return {
    latest(force) {
      if (o.disabled) return Promise.resolve(null);
      if (!force && at && Date.now() - at < TTL) return Promise.resolve(cache);
      // blad sieci: ponowna proba po 10 min zamiast po 6 h
      if (!pending) pending = fetchLatest().then(v => { cache = v; at = v ? Date.now() : Date.now() - TTL + 600000; pending = null; return v; });
      return pending;
    },
  };
}

module.exports = { newer, marketSource, knownFile, gitState, updatePlan, runPlan, createChecker, RELEASES };

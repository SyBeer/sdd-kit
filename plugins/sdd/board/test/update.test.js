// Testy aktualizacji z GitHuba. Kryteria z docs/specs/update.md (AC-UP1..AC-UP7, zmiana 0.27.0).
// Prawdziwy Git i lokalny serwer HTTP zamiast GitHuba; claude zastapiony skryptem (SDD_CLAUDE_BIN).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const up = require('../update');

const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p));
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env: Object.assign({}, process.env, {
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }) });
function fakeClaude() {
  const d = tmp('sdd-fc-'), log = path.join(d, 'log'), bin = path.join(d, process.platform === 'win32' ? 'claude.cmd' : 'claude');
  if (process.platform === 'win32') fs.writeFileSync(bin, `@echo off\r\necho %*>>"${log}"\r\necho ok %*\r\n`);
  else fs.writeFileSync(bin, `#!/bin/sh\necho "$*" >> "${log}"\necho "ok $*"\n`, { mode: 0o755 });
  return { bin, log };
}

test('AC-UP1: newer - porownanie wersji', () => {
  assert.strictEqual(up.newer('0.27.0', '0.26.1'), true);
  assert.strictEqual(up.newer('0.26.0', '0.26.0'), false);
  assert.strictEqual(up.newer('0.9.0', '0.10.0'), false);
  assert.strictEqual(up.newer('v1.0.0', '0.99.9'), true);
  assert.strictEqual(up.newer('', '0.1.0'), false);
  assert.strictEqual(up.newer('abc', '0.1.0'), false);
  assert.strictEqual(up.newer('0.2.0', ''), false);
});

test('AC-UP2: marketSource - skad kit', () => {
  const d = tmp('sdd-km-'), f = path.join(d, 'known.json');
  assert.strictEqual(up.marketSource(f), null);
  fs.writeFileSync(f, '{zly');
  assert.strictEqual(up.marketSource(f), null);
  fs.writeFileSync(f, JSON.stringify({ inne: {} }));
  assert.strictEqual(up.marketSource(f), null);
  fs.writeFileSync(f, JSON.stringify({ 'sdd-kit': { source: { source: 'directory', path: '/x/kit' } } }));
  assert.deepStrictEqual(up.marketSource(f), { type: 'directory', path: '/x/kit' });
  fs.writeFileSync(f, JSON.stringify({ 'sdd-kit': { source: { source: 'github', repo: 'SyBeer/sdd-kit' } } }));
  assert.deepStrictEqual(up.marketSource(f), { type: 'github', repo: 'SyBeer/sdd-kit' });
  fs.writeFileSync(f, JSON.stringify({ 'sdd-kit': { source: { source: 'git', url: 'https://x/y.git' } } }));
  assert.deepStrictEqual(up.marketSource(f), { type: 'git', url: 'https://x/y.git' });
});

test('AC-UP3: updatePlan - kroki zalezne od zrodla', () => {
  const claudeSteps = [['claude', 'plugin', 'marketplace', 'update', 'sdd-kit'], ['claude', 'plugin', 'update', 'sdd@sdd-kit']];
  assert.deepStrictEqual(up.updatePlan({ type: 'github', repo: 'a/b' }), { steps: claudeSteps });
  assert.deepStrictEqual(up.updatePlan({ type: 'git', url: 'u' }), { steps: claudeSteps });
  assert.deepStrictEqual(up.updatePlan({ type: 'directory', path: '/k' }, { isRepo: true, clean: true }),
    { steps: [['git', '-C', '/k', 'pull', '--ff-only']].concat(claudeSteps) });
  assert.match(up.updatePlan({ type: 'directory', path: '/k' }, { isRepo: true, clean: false }).error, /niezapisane zmiany/);
  const zip = up.updatePlan({ type: 'directory', path: '/k' }, { isRepo: false, clean: false });
  assert.match(zip.error, /install\.sh|install\.ps1/);
  assert.ok(!zip.steps);
  assert.match(up.updatePlan(null).error, /nie jest zainstalowany/);
  // kit z GitHuba, panel z ~/.sdd-kit z Git: pull tego folderu tez
  assert.deepStrictEqual(up.updatePlan({ type: 'github', repo: 'a/b' }, null, { dir: '/home/.sdd-kit', state: { isRepo: true, clean: true } }),
    { steps: [['git', '-C', '/home/.sdd-kit', 'pull', '--ff-only']].concat(claudeSteps) });
  assert.match(up.updatePlan({ type: 'github', repo: 'a/b' }, null, { dir: '/home/.sdd-kit', state: { isRepo: true, clean: false } }).error, /niezapisane/);
  // panel z kopii pluginu (bez Git) - tylko claude
  assert.deepStrictEqual(up.updatePlan({ type: 'github', repo: 'a/b' }, null, { dir: '/c', state: { isRepo: false, clean: false } }), { steps: claudeSteps });
  // ten sam folder co zrodlo - jeden pull
  assert.strictEqual(up.updatePlan({ type: 'directory', path: '/k' }, { isRepo: true, clean: true }, { dir: '/k', state: { isRepo: true, clean: true } }).steps.length, 3);
});

test('AC-UP4: gitState na prawdziwym repo', () => {
  const d = tmp('sdd-gs-');
  assert.deepStrictEqual(up.gitState(d), { isRepo: false, clean: false });
  git(d, 'init', '-q'); fs.writeFileSync(path.join(d, 'a.txt'), '1'); git(d, 'add', '.'); git(d, 'commit', '-qm', 'a');
  assert.deepStrictEqual(up.gitState(d), { isRepo: true, clean: true });
  fs.writeFileSync(path.join(d, 'a.txt'), '2');
  assert.deepStrictEqual(up.gitState(d), { isRepo: true, clean: false });
  // podfolder innego repo to nie kit z Git
  fs.mkdirSync(path.join(d, 'sub'));
  assert.deepStrictEqual(up.gitState(path.join(d, 'sub')), { isRepo: false, clean: false });
});

test('AC-UP5: runPlan - git pull, claude, przerwanie na bledzie', async () => {
  const src = tmp('sdd-src-');
  git(src, 'init', '-q', '-b', 'main'); fs.writeFileSync(path.join(src, 'v.txt'), '1'); git(src, 'add', '.'); git(src, 'commit', '-qm', 'v1');
  const dst = path.join(tmp('sdd-dst-'), 'kit');
  git(os.tmpdir(), 'clone', '-q', src, dst);
  fs.writeFileSync(path.join(src, 'v.txt'), '2'); git(src, 'commit', '-qam', 'v2');
  const fc = fakeClaude();
  const env = Object.assign({}, process.env, { SDD_CLAUDE_BIN: fc.bin });
  const r = await up.runPlan(up.updatePlan({ type: 'directory', path: dst }, up.gitState(dst)).steps, env);
  assert.strictEqual(r.ok, true, JSON.stringify(r.log));
  assert.strictEqual(fs.readFileSync(path.join(dst, 'v.txt'), 'utf8'), '2');
  assert.match(fs.readFileSync(fc.log, 'utf8'), /plugin marketplace update sdd-kit\s+plugin update sdd@sdd-kit/);
  assert.strictEqual(r.log.length, 3);
  const bad = await up.runPlan([['git', '-C', path.join(dst, 'nie-ma'), 'pull'], ['claude', 'plugin', 'list']], env);
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.log.length, 1);
  assert.ok(bad.log[0].output.length > 0);
});

function releaseServer(handler) {
  return new Promise(res => {
    let hits = 0;
    const s = http.createServer((req, rq) => { hits++; handler(req, rq); }).listen(0, '127.0.0.1', () =>
      res({ url: 'http://127.0.0.1:' + s.address().port + '/latest', hits: () => hits, close: () => s.close() }));
  });
}

test('AC-UP6: latestRelease - wersja z GitHuba, pamiec 6 h, blad -> null', async () => {
  const s = await releaseServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tag_name: 'v0.30.1', html_url: 'https://github.com/SyBeer/sdd-kit/releases/tag/v0.30.1' })); });
  try {
    const c = up.createChecker({ url: s.url });
    assert.deepStrictEqual(await c.latest(), { version: '0.30.1', url: 'https://github.com/SyBeer/sdd-kit/releases/tag/v0.30.1' });
    await c.latest();
    assert.strictEqual(s.hits(), 1);
    await c.latest(true);
    assert.strictEqual(s.hits(), 2);
  } finally { s.close(); }
  const e = await releaseServer((req, res) => { res.writeHead(404); res.end('{}'); });
  try { assert.strictEqual(await up.createChecker({ url: e.url }).latest(), null); } finally { e.close(); }
  assert.strictEqual(await up.createChecker({ url: 'http://127.0.0.1:9/latest' }).latest(), null);
  assert.strictEqual(await up.createChecker({ url: s.url, disabled: true }).latest(), null);
});

// ---------------------------------------------------------------- serwer (AC-UP7)
const BOARD_DIR = path.join(__dirname, '..');
const TEMPLATES = path.join(BOARD_DIR, '..', 'templates', 'requirements');
function freePort() {
  return new Promise(res => { const s = http.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function call(port, method, url, extra) {
  return new Promise((res, rej) => {
    const r = http.request({ host: '127.0.0.1', port, method, path: url,
      headers: Object.assign({ 'x-sdd': '1', Host: 'localhost:' + port, 'Content-Type': 'application/json' }, extra) }, resp => {
      let d = ''; resp.on('data', c => { d += c; }); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (method === 'POST') r.write('{}');
    r.end();
  });
}

test('AC-UP7: serwer - /api/update stan i aktualizacja', async () => {
  const rel = await releaseServer((req, res) => { res.writeHead(200); res.end(JSON.stringify({ tag_name: 'v99.0.0', html_url: 'https://x/rel' })); });
  const port = await freePort();
  const root = tmp('sdd-up-');
  fs.cpSync(TEMPLATES, path.join(root, 'a', 'requirements'), { recursive: true });
  const known = path.join(root, 'known.json');
  fs.writeFileSync(known, JSON.stringify({ 'sdd-kit': { source: { source: 'github', repo: 'SyBeer/sdd-kit' } } }));
  const fc = fakeClaude();
  const proc = spawn(process.execPath, [path.join(BOARD_DIR, 'server.js'), path.join(root, 'a', 'requirements', '01-interview', 'board.json'), String(port)],
    { cwd: root, env: Object.assign({}, process.env, { SDD_CONFIG: path.join(root, 'config.json'), SDD_MODULES_ROOT: '',
      SDD_RELEASES_URL: rel.url, SDD_KNOWN_MARKETPLACES: known, SDD_KIT_DIR: tmp('sdd-kitdir-'), SDD_CLAUDE_BIN: fc.bin, SDD_UPDATE_CHECK: '' }) });
  await new Promise((res, rej) => {
    let out = '';
    proc.stdout.on('data', c => { out += c; if (/Panel:/.test(out)) res(); });
    proc.on('exit', code => rej(new Error('serwer zakonczyl sie: ' + code + ' ' + out)));
  });
  try {
    const st = JSON.parse((await call(port, 'GET', '/api/update')).body);
    assert.strictEqual(st.latest, '99.0.0');
    assert.strictEqual(st.newer, true);
    assert.strictEqual(st.url, 'https://x/rel');
    assert.strictEqual(st.source, 'github');
    assert.strictEqual(st.canUpdate, true);
    assert.ok(st.current);
    assert.strictEqual((await call(port, 'POST', '/api/update', { 'x-sdd': '' })).code, 403);
    assert.strictEqual((await call(port, 'POST', '/demo/api/update')).code, 403);
    const r = await call(port, 'POST', '/api/update');
    assert.strictEqual(r.code, 200, r.body);
    const j = JSON.parse(r.body);
    assert.strictEqual(j.ok, true);
    assert.strictEqual(j.log.length, 2);
    assert.match(fs.readFileSync(fc.log, 'utf8'), /plugin update sdd@sdd-kit/);
  } finally { proc.kill(); rel.close(); }
});

test('AC-UP9: nowa wersja - zielona strzalka w dol przy numerze wersji w pasku stanu i informacja w Konfiguracji', () => {
  const B = path.join(__dirname, '..');
  const js = fs.readFileSync(path.join(B, 'ui.js'), 'utf8'), css = fs.readFileSync(path.join(B, 'ui.css'), 'utf8');
  const info = fs.readFileSync(path.join(B, 'info.html'), 'utf8');
  // znaczek przy wersji w pasku stanu (nie w naglowku), zielone kolko ze strzalka w dol
  assert.match(js, /ver\.parentNode\.insertBefore\(wrap, ver\.nextSibling\)/);
  assert.match(js, /class="upd-btn"[\s\S]{0,200}aria-label="Dostępna nowa wersja/);
  assert.match(js, />↓<\/button>/);
  assert.doesNotMatch(js, /'↑ ' \+ st\.latest/);
  assert.match(css, /\.statusbar \.upd-btn\{[^}]*border-radius:50%[^}]*background:#2f9e5b/);
  // Konfiguracja (karta Serwer): ta sama strzalka + "jest nowa wersja X" + Aktualizuj otwiera to samo okienko
  assert.match(js, /api\.openUpdate = /);
  assert.match(info, /jest nowa wersja '\+esc\(u\.latest\)/);
  assert.match(info, /SddUI\.openUpdate\(\)/);
  assert.match(info, /fetch\(BASE\+'\/api\/update'\)/);
});

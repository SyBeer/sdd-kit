#!/usr/bin/env node
'use strict';
// GitHub Release z opisem zmian z CHANGELOG.md. Spec: docs/specs/github-release.md
// Uzycie: node scripts/github-release.js <wersja> | --from <wersja> [--dry-run]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = 'SyBeer/sdd-kit';
const API = 'https://api.github.com/repos/' + REPO;

function parseChangelog(text) {
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^## \[([^\]]+)\](?:\s*-\s*(\S+))?/);
    if (m) {
      cur = /^\d+\.\d+\.\d+$/.test(m[1]) ? { version: m[1], date: m[2] || '', lines: [] } : null;
      if (cur) out.push(cur);
    } else if (cur) cur.lines.push(line);
  }
  return out.map(e => ({ version: e.version, date: e.date, body: e.lines.join('\n').trim() }));
}

function cmpVer(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

function selectVersions(entries, from) {
  return entries.filter(e => cmpVer(e.version, from) >= 0).sort((a, b) => cmpVer(a.version, b.version));
}

function findEntry(entries, version) {
  const e = entries.find(x => x.version === version);
  if (!e) throw new Error('Brak sekcji ## [' + version + '] w CHANGELOG.md - najpierw opisz zmiany.');
  return e;
}

function releasePayload(entry, entries) {
  const top = entries.reduce((a, b) => (cmpVer(a.version, b.version) >= 0 ? a : b));
  return {
    tag_name: 'v' + entry.version,
    name: 'v' + entry.version + (entry.date ? ' (' + entry.date + ')' : ''),
    body: entry.body,
    make_latest: entry.version === top.version ? 'true' : 'false',
  };
}

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const out = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8' });
  const m = out.match(/^password=(.+)$/m);
  if (!m) throw new Error('Brak tokenu GitHub (GITHUB_TOKEN ani git credential).');
  return m[1].trim();
}

async function gh(method, url, tok, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'sdd-kit-release' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

async function publish(entry, entries, tok, dry) {
  const p = releasePayload(entry, entries);
  if (dry) {
    console.log('--- ' + p.name + (p.make_latest === 'true' ? ' [latest]' : '') + '\n' + p.body + '\n');
    return;
  }
  const ref = await gh('GET', API + '/git/ref/tags/' + p.tag_name, tok);
  if (ref.status !== 200) throw new Error('Tagu ' + p.tag_name + ' nie ma na GitHubie - najpierw git push origin ' + p.tag_name);
  const ex = await gh('GET', API + '/releases/tags/' + p.tag_name, tok);
  const r = ex.status === 200
    ? await gh('PATCH', API + '/releases/' + ex.data.id, tok, { name: p.name, body: p.body, make_latest: p.make_latest })
    : await gh('POST', API + '/releases', tok, p);
  if (r.status >= 300) throw new Error(p.tag_name + ': GitHub ' + r.status + ' ' + JSON.stringify(r.data && r.data.message));
  console.log((ex.status === 200 ? 'zaktualizowano ' : 'utworzono ') + p.name + ' -> ' + r.data.html_url);
}

async function main(argv) {
  const dry = argv.includes('--dry-run');
  const args = argv.filter(a => a !== '--dry-run');
  const entries = parseChangelog(fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8'));
  let list;
  if (args[0] === '--from' && args[1]) list = selectVersions(entries, args[1]);
  else if (args[0] && /^\d+\.\d+\.\d+$/.test(args[0].replace(/^v/, ''))) list = [findEntry(entries, args[0].replace(/^v/, ''))];
  else throw new Error('Uzycie: node scripts/github-release.js <wersja> | --from <wersja> [--dry-run]');
  const tok = dry ? null : token();
  let failed = 0;
  for (const e of list) {
    try { await publish(e, entries, tok, dry); } catch (err) { failed++; console.error('BLAD ' + err.message); }
  }
  if (failed) process.exitCode = 1;
}

if (require.main === module) main(process.argv.slice(2)).catch(err => { console.error(err.message); process.exit(1); });

module.exports = { parseChangelog, selectVersions, releasePayload, findEntry, cmpVer };

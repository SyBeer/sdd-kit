#!/usr/bin/env node
// Backlog w Redmine dla /sdd:handover (spec: docs/specs/redmine.md, zmiana 0.29.0). REST API Redmine, bez zaleznosci.
// Uzycie:  node redmine.js check [--req requirements]
//          node redmine.js push <zadania.json> [--req requirements] [--dry-run]
// Konfiguracja: SDD.yaml (redmine_url, redmine_project, redmine_tracker). Klucz API: REDMINE_API_KEY albo Pek kluczy
// macOS (usluga "redmine-api-key"). Klucz nigdy nie trafia do plikow ani na wyjscie.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { yamlField } = require('./info');

const KEY_HELP = 'Brak klucza API Redmine. Ustaw go raz (klucz: Redmine -> Moje konto -> Klucz dostepu do API):\n' +
  '  macOS (Pek kluczy):  security add-generic-password -s redmine-api-key -a "$USER" -w\n' +
  '  albo w ~/.zshrc:     export REDMINE_API_KEY=...\n' +
  'Nie wklejaj klucza do czatu ani do plikow projektu.';

// Konfiguracja z SDD.yaml (AC-RM1).
function readConfig(yaml) {
  const url = yamlField(yaml, 'redmine_url').replace(/\/+$/, '');
  const project = yamlField(yaml, 'redmine_project');
  if (!url) throw new Error('Brak redmine_url w SDD.yaml (adres Redmine, np. https://redmine.firma.pl).');
  if (!/^https?:\/\/[^\s/]+/.test(url)) throw new Error('redmine_url musi zaczynac sie od http:// albo https:// - jest: ' + url);
  if (!project) throw new Error('Brak redmine_project w SDD.yaml (identyfikator projektu z adresu /projects/<identyfikator>).');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project)) throw new Error('redmine_project to identyfikator (male litery, cyfry, - i _), nie nazwa - jest: ' + project);
  return { url, project, tracker: yamlField(yaml, 'redmine_tracker') };
}

// Tracker: z konfiguracji (nazwa, bez wielkosci liter) albo pierwszy "funkcjonalnosc / zadanie" - zadania z wymagan
// nie moga trafic jako bledy tylko dlatego, ze "Bug" jest w projekcie pierwszy (AC-RM10, prawdziwy Redmine 2026-10-04).
const FEATURE = /feature|funkcjonaln|story|user story|zadanie|task|wymaganie|requirement/i;
const BUG = /bug|b[lł][aą]d|defect|incident/i;
function pickTracker(trackers, name) {
  if (name) return trackers.find(t => t.name.toLowerCase() === String(name).toLowerCase()) || null;
  return trackers.find(t => FEATURE.test(t.name) && !BUG.test(t.name)) || trackers.find(t => !BUG.test(t.name)) || trackers[0] || null;
}

// Tresc zapytania o zadanie (AC-RM2): nowe z projektem i trackerem, aktualizacja tylko temat i opis.
function issueBody(task, projectId, trackerId) {
  const issue = task.issue ? {} : { project_id: projectId, tracker_id: trackerId };
  issue.subject = task.subject;
  issue.description = task.description;
  return { issue };
}

function apiKey(env) {
  env = env || process.env;
  if (env.REDMINE_API_KEY) return env.REDMINE_API_KEY;
  if (process.platform === 'darwin' && env.SDD_REDMINE_KEYCHAIN !== '0') {
    try { return execFileSync('security', ['find-generic-password', '-s', 'redmine-api-key', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch (e) { /* brak w Peku kluczy */ }
  }
  return '';
}

function client(cfg, key) {
  return async function call(method, p, body) {
    let r;
    try {
      r = await fetch(cfg.url + p, { method, headers: { 'X-Redmine-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined });
    } catch (e) { throw new Error('Brak polaczenia z ' + cfg.url + ' (' + (e.cause && e.cause.code || e.message) + ').'); }
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    return { status: r.status, data };
  };
}
const errs = d => (d && d.errors ? d.errors.join('; ') : '');

async function project(call, cfg) {
  const r = await call('GET', '/projects/' + encodeURIComponent(cfg.project) + '.json?include=trackers');
  if (r.status === 401) throw new Error('Redmine odrzucil klucz API (401) - sprawdz klucz i czy REST API jest wlaczone (Administracja -> Ustawienia -> API).');
  if (r.status === 404) throw new Error('Nie ma projektu "' + cfg.project + '" w ' + cfg.url + ' albo nie masz do niego dostepu (404).');
  if (r.status !== 200 || !r.data || !r.data.project) throw new Error('Redmine: ' + r.status + ' ' + errs(r.data));
  const p = r.data.project, trackers = p.trackers || [];
  const tracker = pickTracker(trackers, cfg.tracker);
  if (!tracker) throw new Error(cfg.tracker ? 'Projekt nie ma trackera "' + cfg.tracker + '" - dostepne: ' + trackers.map(t => t.name).join(', ') : 'Projekt nie ma zadnego trackera.');
  return { project: { id: p.id, name: p.name, identifier: p.identifier }, trackers: trackers.map(t => ({ id: t.id, name: t.name })), tracker };
}

// Zadania po kolei, potem relacje "poprzedza" (AC-RM4). Blad -> wyjatek z tym, co juz zalozono (AC-RM5).
async function push(call, cfg, tasks, dry) {
  const done = [];
  if (dry) return tasks.map(t => ({ key: t.key, id: t.issue || null, url: t.issue ? cfg.url + '/issues/' + t.issue : null, action: 'dry-run', subject: t.subject }));
  const info = await project(call, cfg);
  for (const t of tasks) {
    const body = issueBody(t, info.project.id, info.tracker.id);
    const r = t.issue ? await call('PUT', '/issues/' + t.issue + '.json', body) : await call('POST', '/issues.json', body);
    const ok = t.issue ? r.status === 204 || r.status === 200 : r.status === 201;
    if (!ok) { const e = new Error('Zadanie ' + t.key + ': Redmine ' + r.status + ' ' + errs(r.data)); e.done = done; throw e; }
    const id = t.issue || r.data.issue.id;
    done.push({ key: t.key, id, url: cfg.url + '/issues/' + id, action: t.issue ? 'updated' : 'created' });
  }
  const idOf = {};
  done.forEach(d => { idOf[d.key] = d.id; });
  for (const t of tasks) {
    for (const prev of t.after || []) {
      if (!idOf[prev]) continue;
      const r = await call('POST', '/issues/' + idOf[prev] + '/relations.json', { relation: { issue_to_id: idOf[t.key], relation_type: 'precedes' } });
      if (r.status !== 201 && r.status !== 422) { const e = new Error('Relacja ' + prev + ' -> ' + t.key + ': Redmine ' + r.status + ' ' + errs(r.data)); e.done = done; throw e; }
    }
  }
  return done;
}

async function main(argv) {
  const dry = argv.includes('--dry-run');
  const i = argv.indexOf('--req');
  const req = path.resolve(i >= 0 ? argv[i + 1] : 'requirements');
  const args = argv.filter((a, n) => a !== '--dry-run' && n !== i && n !== i + 1);
  const cfg = readConfig(fs.readFileSync(path.join(req, 'SDD.yaml'), 'utf8').replace(/\r\n?/g, '\n'));
  const cmd = args[0];
  if (cmd !== 'check' && cmd !== 'push') throw new Error('Uzycie: redmine.js check | push <zadania.json> [--req requirements] [--dry-run]');
  let tasks = null;
  if (cmd === 'push') {
    if (!args[1]) throw new Error('Podaj plik zadan: redmine.js push <zadania.json>');
    tasks = JSON.parse(fs.readFileSync(path.resolve(args[1]), 'utf8')).tasks || [];
  }
  const key = dry ? '' : apiKey();
  if (!dry && !key) throw new Error(KEY_HELP);
  const call = client(cfg, key);
  if (cmd === 'check') return console.log(JSON.stringify(await project(call, cfg), null, 2));
  try {
    console.log(JSON.stringify(await push(call, cfg, tasks, dry), null, 2));
  } catch (e) {
    console.log(JSON.stringify(e.done || [], null, 2));
    throw e;
  }
}

if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });

module.exports = { readConfig, pickTracker, issueBody, apiKey, push, project };

#!/usr/bin/env node
// Backlog w Redmine dla /sdd:handover (spec: docs/specs/redmine.md, zmiana 0.28.4). REST API Redmine, bez zaleznosci.
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
  // Format opisu (AC-RM11): Markdown domyslnie (tabele i obrazy dzialaja), Textile dla starszych instalacji
  const format = yamlField(yaml, 'redmine_format') || 'markdown';
  if (format !== 'markdown' && format !== 'textile') throw new Error('redmine_format: markdown albo textile - jest: ' + format);
  // Pole wlasne na kryteria akceptacji (AC-RM13): nazwa albo numer; puste = tylko opis
  return { url, project, tracker: yamlField(yaml, 'redmine_tracker'), format, acField: yamlField(yaml, 'redmine_ac_field') };
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
function issueBody(task, projectId, trackerId, acFieldId) {
  const issue = task.issue ? {} : { project_id: projectId, tracker_id: trackerId };
  issue.subject = task.subject;
  issue.description = task.description;
  if (acFieldId && task.acceptance != null) issue.custom_fields = [{ id: acFieldId, value: task.acceptance }];
  return { issue };
}

// Numer pola wlasnego z nazwy: /custom_fields.json wymaga admina, wiec bierzemy go z pola custom_fields zadan projektu
// (najpierw zadania wybranego trackera, potem dowolne) - AC-RM13.
async function acFieldOf(call, cfg, projectId, trackerId) {
  if (!cfg.acField) return null;
  if (/^\d+$/.test(cfg.acField)) return { id: +cfg.acField, name: '' };
  const want = cfg.acField.toLowerCase();
  for (const q of ['&tracker_id=' + trackerId, '']) {
    const r = await call('GET', '/issues.json?project_id=' + projectId + q + '&status_id=*&limit=25');
    const found = ((r.data && r.data.issues) || []).map(i => (i.custom_fields || []).find(c => c.name.toLowerCase() === want)).find(Boolean);
    if (found) return { id: found.id, name: found.name };
  }
  throw new Error('Nie znalazlem pola "' + cfg.acField + '" w zadaniach projektu (nazwe pola widac tylko w istniejacych zadaniach). ' +
    'Wpisz w SDD.yaml numer pola zamiast nazwy, np. redmine_ac_field: 1 (numer: Administracja -> Pola wlasne, w adresie /custom_fields/<numer>).');
}

// Zalaczniki zadania (AC-RM12): sciezki wzgledem requirements/, tylko pliki wewnatrz tego folderu.
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv' };
function attachmentFiles(req, tasks) {
  const root = path.resolve(req) + path.sep;
  return tasks.map(t => (t.attachments || []).map(rel => {
    const f = path.resolve(req, String(rel));
    if (!f.startsWith(root)) throw new Error('Zadanie ' + t.key + ': zalacznik spoza folderu requirements: ' + rel);
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw new Error('Zadanie ' + t.key + ': nie ma pliku ' + rel);
    const name = path.basename(f), ext = name.split('.').pop().toLowerCase();
    return { file: f, name, type: TYPES[ext] || 'application/octet-stream' };
  }));
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
  return async function call(method, p, body, type) {
    let r;
    try {
      r = await fetch(cfg.url + p, { method, headers: { 'X-Redmine-API-Key': key, 'Content-Type': type || 'application/json', Accept: 'application/json' },
        body: body == null ? undefined : type ? body : JSON.stringify(body) });
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
  const acField = await acFieldOf(call, cfg, p.id, tracker.id);
  return { project: { id: p.id, name: p.name, identifier: p.identifier }, trackers: trackers.map(t => ({ id: t.id, name: t.name })), tracker, acField };
}

// Zadania po kolei, potem relacje "poprzedza" (AC-RM4). Blad -> wyjatek z tym, co juz zalozono (AC-RM5).
async function push(call, cfg, tasks, dry, req) {
  const done = [];
  const files = attachmentFiles(req || '.', tasks);  // bledne sciezki - przed wyslaniem czegokolwiek
  if (dry) return tasks.map((t, n) => ({ key: t.key, id: t.issue || null, url: t.issue ? cfg.url + '/issues/' + t.issue : null,
    action: 'dry-run', subject: t.subject, attachments: files[n].length }));
  const info = await project(call, cfg);
  for (let n = 0; n < tasks.length; n++) {
    const t = tasks[n];
    const body = issueBody(t, info.project.id, info.tracker.id, info.acField && info.acField.id);
    let todo = files[n];
    if (todo.length && t.issue) {  // ponowny handover: pliki, ktore zadanie juz ma, pomijamy
      const g = await call('GET', '/issues/' + t.issue + '.json?include=attachments');
      const have = new Set(((g.data && g.data.issue && g.data.issue.attachments) || []).map(a => a.filename));
      todo = todo.filter(a => !have.has(a.name));
    }
    const uploads = [];
    for (const a of todo) {
      const u = await call('POST', '/uploads.json?filename=' + encodeURIComponent(a.name), fs.readFileSync(a.file), 'application/octet-stream');
      if (u.status !== 201 || !u.data || !u.data.upload) { const e = new Error('Zadanie ' + t.key + ', zalacznik ' + a.name + ': Redmine ' + u.status + ' ' + errs(u.data)); e.done = done; throw e; }
      uploads.push({ token: u.data.upload.token, filename: a.name, content_type: a.type });
    }
    if (uploads.length) body.issue.uploads = uploads;
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
  if (cmd === 'check') return console.log(JSON.stringify(Object.assign(await project(call, cfg), { format: cfg.format }), null, 2));
  try {
    console.log(JSON.stringify(await push(call, cfg, tasks, dry, req), null, 2));
  } catch (e) {
    console.log(JSON.stringify(e.done || [], null, 2));
    throw e;
  }
}

if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exit(1); });

module.exports = { readConfig, pickTracker, attachmentFiles, issueBody, apiKey, push, project };

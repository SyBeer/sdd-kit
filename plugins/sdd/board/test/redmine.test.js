// Backlog w Redmine. Kryteria z docs/specs/redmine.md (AC-RM1..AC-RM8, zmiana 0.29.0).
// Prawdziwego Redmine tu nie ma - lokalny serwer HTTP odpowiada jak REST API Redmine (te same adresy i pola).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const rm = require('../redmine');
const info = require('../info');

const KEY = 'sekretny-klucz-123';
const YAML = 'project: "x"\nbacklog: redmine\nredmine_url: "URL"\nredmine_project: "faktury"\n';

// Udawany Redmine: projekt "faktury" (id 7) z trackerami, zapis zadan i relacji, log zapytan.
function fakeRedmine(opts) {
  opts = opts || {};
  const log = [];
  let next = 100;
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        log.push({ method: req.method, url: req.url, key: req.headers['x-redmine-api-key'], body: body ? JSON.parse(body) : null });
        const send = (code, obj) => { rq.writeHead(code, { 'Content-Type': 'application/json' }); rq.end(obj ? JSON.stringify(obj) : ''); };
        if (req.headers['x-redmine-api-key'] !== KEY) return send(401);
        if (req.method === 'GET' && req.url.startsWith('/projects/faktury.json'))
          return send(200, { project: { id: 7, name: 'Faktury', identifier: 'faktury', trackers: [{ id: 2, name: 'Feature' }, { id: 1, name: 'Bug' }] } });
        if (req.method === 'GET' && req.url.startsWith('/projects/')) return send(404);
        if (req.method === 'POST' && req.url === '/issues.json') {
          if (opts.failSecond && next === 101) return send(422, { errors: ['Subject cannot be blank'] });
          return send(201, { issue: { id: next++, subject: JSON.parse(body).issue.subject } });
        }
        if (req.method === 'PUT' && /^\/issues\/\d+\.json$/.test(req.url)) return send(204);
        if (req.method === 'POST' && /^\/issues\/\d+\/relations\.json$/.test(req.url)) {
          if (opts.relationExists) return send(422, { errors: ['Related issue has already been taken'] });
          return send(201, { relation: { id: 1 } });
        }
        send(404);
      });
    }).listen(0, '127.0.0.1', () => res({ url: 'http://127.0.0.1:' + s.address().port, log, close: () => s.close() }));
  });
}
function moduleWith(url, extra) {
  const req = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-rm-')), 'requirements');
  fs.mkdirSync(path.join(req, '04-validation'), { recursive: true });
  fs.writeFileSync(path.join(req, 'SDD.yaml'), YAML.replace('URL', url) + (extra || ''));
  return req;
}
function run(args, env) {
  return new Promise(res => {
    const p = spawn(process.execPath, [path.join(__dirname, '..', 'redmine.js')].concat(args),
      { env: Object.assign({}, process.env, { REDMINE_API_KEY: '', SDD_REDMINE_KEYCHAIN: '0' }, env) });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; });
    p.on('close', code => res({ code, out, err }));
  });
}
const TASKS = { tasks: [
  { key: 'T-01', subject: '[R-001] Wpis odczytu', description: 'Opis 1', after: [] },
  { key: 'T-02', subject: '[R-002] Raport miesieczny', description: 'Opis 2', after: ['T-01'] },
  { key: 'T-03', subject: '[R-003] Eksport', description: 'Opis 3', after: ['T-02'], issue: 55 },
] };
function tasksFile(req, t) { const f = path.join(req, '04-validation', 'redmine-test.json'); fs.writeFileSync(f, JSON.stringify(t || TASKS)); return f; }

test('AC-RM1: readConfig - adres, projekt, tracker, walidacja', () => {
  assert.deepStrictEqual(rm.readConfig('redmine_url: "https://rm.firma.pl/"\nredmine_project: "faktury"\nredmine_tracker: "Feature"\n'),
    { url: 'https://rm.firma.pl', project: 'faktury', tracker: 'Feature' });
  assert.deepStrictEqual(rm.readConfig('redmine_url: http://10.0.0.5:3000\nredmine_project: a_b-1\n'),
    { url: 'http://10.0.0.5:3000', project: 'a_b-1', tracker: '' });
  assert.throws(() => rm.readConfig('redmine_project: "x"\n'), /redmine_url/);
  assert.throws(() => rm.readConfig('redmine_url: "https://a"\n'), /redmine_project/);
  assert.throws(() => rm.readConfig('redmine_url: "ftp://a"\nredmine_project: "x"\n'), /redmine_url/);
  assert.throws(() => rm.readConfig('redmine_url: "https://a"\nredmine_project: "Zle Id"\n'), /redmine_project/);
});

test('AC-RM2: issueBody - nowe zadanie z projektem i trackerem, aktualizacja bez nich', () => {
  const t = { key: 'T-01', subject: 'S', description: 'D' };
  assert.deepStrictEqual(rm.issueBody(t, 7, 2), { issue: { project_id: 7, tracker_id: 2, subject: 'S', description: 'D' } });
  assert.deepStrictEqual(rm.issueBody(Object.assign({ issue: 5 }, t), 7, 2), { issue: { subject: 'S', description: 'D' } });
});

test('AC-RM3: check - projekt, trackery, wybrany tracker; 401 i 404 po polsku', async () => {
  const s = await fakeRedmine();
  try {
    let r = await run(['check', '--req', moduleWith(s.url)], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const j = JSON.parse(r.out);
    assert.strictEqual(j.project.name, 'Faktury');
    assert.deepStrictEqual(j.trackers.map(t => t.name), ['Feature', 'Bug']);
    assert.strictEqual(j.tracker.name, 'Feature');
    assert.strictEqual(s.log[0].key, KEY);
    r = await run(['check', '--req', moduleWith(s.url, 'redmine_tracker: "Bug"\n')], { REDMINE_API_KEY: KEY });
    assert.strictEqual(JSON.parse(r.out).tracker.name, 'Bug');
    r = await run(['check', '--req', moduleWith(s.url)], { REDMINE_API_KEY: 'zly' });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /klucz/i);
    const req404 = moduleWith(s.url); fs.writeFileSync(path.join(req404, 'SDD.yaml'), YAML.replace('URL', s.url).replace('faktury', 'nie-ma'));
    r = await run(['check', '--req', req404], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /projekt/i);
  } finally { s.close(); }
});

test('AC-RM4: push - nowe POST, istniejace PUT, relacje poprzedza, dry-run bez zapisu', async () => {
  const s = await fakeRedmine({ relationExists: false });
  try {
    const req = moduleWith(s.url);
    let r = await run(['push', tasksFile(req), '--req', req, '--dry-run'], {});
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual(JSON.parse(r.out).map(x => x.action), ['dry-run', 'dry-run', 'dry-run']);
    assert.strictEqual(s.log.filter(x => x.method !== 'GET').length, 0);
    r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, r.err);
    const out = JSON.parse(r.out);
    assert.deepStrictEqual(out.map(x => [x.key, x.id, x.action]), [['T-01', 100, 'created'], ['T-02', 101, 'created'], ['T-03', 55, 'updated']]);
    assert.strictEqual(out[0].url, s.url + '/issues/100');
    const post = s.log.filter(x => x.method === 'POST' && x.url === '/issues.json');
    assert.deepStrictEqual(post[0].body, { issue: { project_id: 7, tracker_id: 2, subject: '[R-001] Wpis odczytu', description: 'Opis 1' } });
    const put = s.log.find(x => x.method === 'PUT');
    assert.strictEqual(put.url, '/issues/55.json');
    assert.deepStrictEqual(put.body, { issue: { subject: '[R-003] Eksport', description: 'Opis 3' } });
    const rel = s.log.filter(x => /relations/.test(x.url));
    assert.deepStrictEqual(rel.map(x => [x.url, x.body.relation.issue_to_id, x.body.relation.relation_type]),
      [['/issues/100/relations.json', 101, 'precedes'], ['/issues/101/relations.json', 55, 'precedes']]);
  } finally { s.close(); }
  const s2 = await fakeRedmine({ relationExists: true });
  try {
    const req = moduleWith(s2.url);
    const r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 0, 'istniejaca relacja nie jest bledem: ' + r.err);
  } finally { s2.close(); }
});

test('AC-RM5: blad przy drugim zadaniu - kod 1, pierwsze zadanie w wyniku', async () => {
  const s = await fakeRedmine({ failSecond: true });
  try {
    const req = moduleWith(s.url);
    const r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.strictEqual(r.code, 1);
    const out = JSON.parse(r.out);
    assert.deepStrictEqual(out.map(x => [x.key, x.id]), [['T-01', 100]]);
    assert.match(r.err, /T-02/);
    assert.match(r.err, /Subject cannot be blank/);
  } finally { s.close(); }
});

test('AC-RM6: klucz nie trafia na wyjscie; brak klucza - jak go ustawic', async () => {
  const s = await fakeRedmine();
  try {
    const req = moduleWith(s.url);
    let r = await run(['push', tasksFile(req), '--req', req], { REDMINE_API_KEY: KEY });
    assert.ok(!(r.out + r.err).includes(KEY));
    r = await run(['check', '--req', req], {});
    assert.strictEqual(r.code, 1);
    assert.match(r.err, /REDMINE_API_KEY/);
    assert.match(r.err, /redmine-api-key/);
  } finally { s.close(); }
});

test('AC-RM7: konfiguracja - backlog redmine, adres i projekt przez yamlSet', () => {
  assert.ok(info.BACKLOGS.includes('redmine'));
  const y = 'project: "x"\nbacklog: none          # none | linear | jira | redmine | file\n';
  const out = info.yamlSet(y, { backlog: 'redmine', redmine_url: 'https://rm.firma.pl/', redmine_project: 'faktury' });
  assert.match(out, /^backlog: redmine/m);
  assert.match(out, /^redmine_url: "https:\/\/rm\.firma\.pl"$/m);
  assert.match(out, /^redmine_project: "faktury"$/m);
  assert.throws(() => info.yamlSet(y, { redmine_url: 'rm.firma.pl' }), /redmine_url/);
  assert.throws(() => info.yamlSet(y, { redmine_project: 'Zle Id' }), /redmine_project/);
});

test('AC-RM8: skill handover opisuje Redmine', () => {
  const sk = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'handover', 'SKILL.md'), 'utf8');
  assert.match(sk, /`redmine`/);
  ['redmine.js', 'check', '--dry-run', 'push', 'REDMINE_API_KEY', 'TRACEABILITY'].forEach(w => assert.ok(sk.includes(w), 'brak: ' + w));
  assert.match(sk, /nie pro[sś] o wklejenie klucza/i);
});

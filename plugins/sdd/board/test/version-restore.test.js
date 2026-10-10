// "Pokaż zmiany" i "Przywróć" przy wersjach - mechanizm (0.42.0, docs/specs/version-restore.md AC-VR1..AC-VR3).
// Prawdziwy git w katalogach tymczasowych, izolowana konfiguracja gita.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-vr-'));
const GCFG = path.join(TMP, 'gitconfig');
fs.writeFileSync(GCFG, '');
process.env.GIT_CONFIG_GLOBAL = GCFG;
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.SDD_COPY_HOST = 'testhost';
const rc = require('../repo-copy');

let n = 0;
const g = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const R = (mod, f) => path.join(mod, 'requirements', f);
const put = (mod, f, s) => { fs.mkdirSync(path.dirname(R(mod, f)), { recursive: true }); fs.writeFileSync(R(mod, f), s); };
const get = (mod, f) => fs.readFileSync(R(mod, f), 'utf8');
const has = (mod, f) => fs.existsSync(R(mod, f));

// modul w podfolderze (sciezka wzgledna w drzewie), PRD + slownik zacommitowane na main
function repo() {
  const dir = path.join(TMP, 'r' + (++n));
  const mod = path.join(dir, 'modul');
  fs.mkdirSync(mod, { recursive: true });
  g(TMP, 'init', '-q', '-b', 'main', dir);
  g(dir, 'config', 'user.email', 'jan@firma.pl'); g(dir, 'config', 'user.name', 'Jan');
  put(mod, 'SDD.yaml', 'project: "x"\n');
  put(mod, '03-spec/PRD.md', 'cel: A\nzakres: B\n');
  put(mod, '02-domain/GLOSSARY.md', 'slowo\n');
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(1)\n');
  fs.writeFileSync(path.join(dir, '.gitignore'), 'modul/requirements/tmp-*.txt\n');
  g(dir, 'add', '-A'); g(dir, 'commit', '-q', '-m', 'start');
  return { dir, mod };
}
async function version(mod, name, h) {
  const v = await rc.makeVersion(mod, name, { push: false, now: new Date(2026, 9, 10, h || 9) });
  assert.ok(v.ok, v.error);
  return v.tag;
}

test('AC-VR1: versionDiff - zmieniony, dodany (takze nieśledzony), usuniety, binarny, bez zmian, obca nazwa', async () => {
  const { mod } = repo();
  const tag = await version(mod, 'pokazane');
  let d = await rc.versionDiff(mod, tag);
  assert.strictEqual(d.ok, true);
  assert.deepStrictEqual(d.files, []);
  put(mod, '03-spec/PRD.md', 'cel: A2\nzakres: B\nnowe: C\n');
  put(mod, '00-intake/mail.md', 'nowy, niesledzony\n');
  fs.rmSync(R(mod, '02-domain/GLOSSARY.md'));
  put(mod, '00-intake/obraz.png', Buffer.from([0, 1, 2, 3, 0, 255]));
  d = await rc.versionDiff(mod, tag);
  const by = Object.fromEntries(d.files.map(f => [f.file, f]));
  assert.deepStrictEqual(Object.keys(by).sort(), ['00-intake/mail.md', '00-intake/obraz.png', '02-domain/GLOSSARY.md', '03-spec/PRD.md']);
  assert.strictEqual(by['03-spec/PRD.md'].status, 'changed');
  assert.strictEqual(by['03-spec/PRD.md'].adds, 2);
  assert.strictEqual(by['03-spec/PRD.md'].dels, 1);
  assert.match(by['03-spec/PRD.md'].patch, /^-cel: A$/m);
  assert.match(by['03-spec/PRD.md'].patch, /^\+nowe: C$/m);
  assert.strictEqual(by['00-intake/mail.md'].status, 'added');
  assert.strictEqual(by['02-domain/GLOSSARY.md'].status, 'removed');
  assert.strictEqual(by['00-intake/obraz.png'].binary, true);
  assert.strictEqual(by['00-intake/obraz.png'].patch, '');
  assert.strictEqual(d.truncated, false);
  const bad = await rc.versionDiff(mod, 'v1.0');
  assert.strictEqual(bad.ok, false);
  assert.match(bad.error, /wersj/i);
});

test('AC-VR8: news - co nowego wzgledem poprzedniej wersji, kopii albo od zera; najnowsza bez zmian od zapisu', async () => {
  const { mod } = repo();
  const t1 = await version(mod, 'v1', 9);
  let d = await rc.versionDiff(mod, t1);
  assert.deepStrictEqual(d.news.base, { kind: 'none', name: '' });
  assert.deepStrictEqual(d.news.files.map(f => [f.file, f.status]).sort(),
    [['02-domain/GLOSSARY.md', 'added'], ['03-spec/PRD.md', 'added'], ['SDD.yaml', 'added']]);
  put(mod, '03-spec/PRD.md', 'cel: A\nzakres: B\nkarteczka 1\n');
  await rc.makeCopy(mod);
  put(mod, '00-intake/mail.md', 'karteczka 2\n');
  const t2 = await version(mod, 'v2', 10);
  d = await rc.versionDiff(mod, t2);
  assert.deepStrictEqual(d.files, [], 'od zapisu nic sie nie zmienilo');
  assert.deepStrictEqual(d.news.base, { kind: 'version', name: 'v1' });
  assert.deepStrictEqual(d.news.files.map(f => [f.file, f.status]).sort(), [['00-intake/mail.md', 'added'], ['03-spec/PRD.md', 'changed']]);
  assert.match(d.news.files.find(f => f.file === '03-spec/PRD.md').patch, /^\+karteczka 1$/m);
  assert.strictEqual(d.news.truncated, false);
  put(mod, '02-domain/GLOSSARY.md', 'po wersji\n');
  d = await rc.versionDiff(mod, t2);
  assert.deepStrictEqual(d.files.map(f => f.file), ['02-domain/GLOSSARY.md']);
  assert.ok(!d.news.files.some(f => f.file === '02-domain/GLOSSARY.md'), 'zmiana po wersji nie jest "nowa w wersji"');
  // najstarsza wersja z wczesniejsza kopia -> porownanie z poprzednia kopia
  const b = repo();
  await rc.makeCopy(b.mod);
  put(b.mod, '03-spec/PRD.md', 'inny cel\n');
  const t = await version(b.mod, 'pierwsza', 9);
  d = await rc.versionDiff(b.mod, t);
  assert.deepStrictEqual(d.news.base, { kind: 'copy', name: '' });
  assert.deepStrictEqual(d.news.files.map(f => [f.file, f.status]), [['03-spec/PRD.md', 'changed']]);
});

test('AC-VS4: versionDiff - summary po kluczach w obu czesciach (tablica, pytania, inny plik)', async () => {
  const { mod } = repo();
  const B = notes => JSON.stringify({ title: 'T', lanes: ['Odczyt', 'Rozliczenie'], notes, updated: 'x' });
  const Q = st => '| ID | Pytanie | Status |\n|---|---|---|\n| Q-001 | Czy pula? | ' + st + ' |\n';
  put(mod, '01-interview/board.json', B([{ id: 'n1', lane: 'Odczyt', col: 1, text: '1', type: 'hot' }]));
  put(mod, '01-interview/QUESTIONS.md', Q('otwarte'));
  const t1 = await version(mod, 'v1', 9);
  put(mod, '01-interview/board.json', B([{ id: 'n1', lane: 'Rozliczenie', col: 6, text: '1', type: 'hot', updated: 'y' }]));
  put(mod, '01-interview/QUESTIONS.md', Q('zamknięte'));
  put(mod, '00-intake/mail.md', 'nowy\n');
  const t2 = await version(mod, 'v2', 10);
  put(mod, '01-interview/QUESTIONS.md', Q('zamknięte') + '| Q-002 | Nowe? | otwarte |\n');
  const d = await rc.versionDiff(mod, t2);
  const by = (sum, file) => (sum.find(x => x.file === file) || {});
  const nb = by(d.news.summary, '01-interview/board.json');
  assert.strictEqual(nb.group, 'board');
  assert.deepStrictEqual(nb.items, [{ type: 'note', change: 'moved', text: '1', noteType: 'hot', from: 'Odczyt', to: 'Rozliczenie' }]);
  assert.deepStrictEqual(by(d.news.summary, '01-interview/QUESTIONS.md').items,
    [{ type: 'entry', change: 'changed', key: 'Q-001', title: 'Czy pula?', fields: [{ name: 'Status', from: 'otwarte', to: 'zamknięte' }] }]);
  assert.deepStrictEqual(by(d.news.summary, '00-intake/mail.md'), { file: '00-intake/mail.md', group: 'other', items: [{ type: 'file', change: 'added' }] });
  assert.deepStrictEqual(d.summary.map(x => [x.file, x.items.map(i => i.key + ':' + i.change)]), [['01-interview/QUESTIONS.md', ['Q-002:added']]]);
  // pierwsza wersja (wszystko nowe) - tez z podsumowaniem
  const d1 = await rc.versionDiff(mod, t1);
  assert.ok(by(d1.news.summary, '01-interview/board.json').items.some(i => i.change === 'added' && i.text === '1'));
});

test('AC-VR2: restoreVersion - pliki jak w wersji, HEAD i indeks bez zmian, wersja bezpieczenstwa, duze i ignorowane nietkniete', async () => {
  const { dir, mod } = repo();
  const tag = await version(mod, 'pokazane');
  const head = g(dir, 'rev-parse', 'HEAD');
  // praca po wersji
  put(mod, '03-spec/PRD.md', 'cel: ZMIANA\n');
  put(mod, '00-intake/mail.md', 'dodany po wersji\n');
  fs.rmSync(R(mod, '02-domain/GLOSSARY.md'));
  put(mod, 'tmp-notatka.txt', 'ignorowany\n');
  put(mod, '00-intake/duzy.bin', 'x'.repeat(2048));
  fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(2)\n');
  const r = await rc.restoreVersion(mod, tag, { push: false, maxBytes: 1024, now: new Date(2026, 9, 10, 14, 5) });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(get(mod, '03-spec/PRD.md'), 'cel: A\nzakres: B\n');
  assert.strictEqual(get(mod, '02-domain/GLOSSARY.md'), 'slowo\n');
  assert.strictEqual(has(mod, '00-intake/mail.md'), false);
  assert.strictEqual(r.removed, 1);
  assert.ok(r.restored >= 3);
  // nietkniete: ignorowany, wiekszy niz limit, kod poza requirements/
  assert.strictEqual(get(mod, 'tmp-notatka.txt'), 'ignorowany\n');
  assert.strictEqual(has(mod, '00-intake/duzy.bin'), true);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'app.js'), 'utf8'), 'console.log(2)\n');
  assert.strictEqual(g(dir, 'rev-parse', 'HEAD'), head);
  assert.strictEqual(g(dir, 'diff', '--cached', '--name-only'), '');
  // wersja bezpieczenstwa z poprzednim stanem
  assert.match(r.before.name, /^przed przywróceniem pokazane 14:05$/);
  const list = await rc.listVersions(mod);
  assert.ok(list.some(v => v.tag === r.before.tag));
  const back = await rc.restoreVersion(mod, r.before.tag, { push: false, maxBytes: 1024, now: new Date(2026, 9, 10, 14, 6) });
  assert.strictEqual(back.ok, true, back.error);
  assert.strictEqual(get(mod, '03-spec/PRD.md'), 'cel: ZMIANA\n');
  assert.strictEqual(get(mod, '00-intake/mail.md'), 'dodany po wersji\n');
  assert.strictEqual(has(mod, '02-domain/GLOSSARY.md'), false);
});

test('AC-VR2: obca nazwa wersji - blad, pliki bez zmian', async () => {
  const { dir, mod } = repo();
  g(dir, 'tag', 'v1.0');
  put(mod, '03-spec/PRD.md', 'praca\n');
  const r = await rc.restoreVersion(mod, 'v1.0', { push: false });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /wersj/i);
  assert.strictEqual(get(mod, '03-spec/PRD.md'), 'praca\n');
  assert.deepStrictEqual(await rc.listVersions(mod), []);
});

test('AC-VR3: kopista - diff i restore w kolejce, status odswiezony', async () => {
  const { mod } = repo();
  const tag = await version(mod, 'pokazane');
  const changes = [];
  const c = rc.createCopier(mod, { delayMs: 60000, onChange: s => changes.push(s.state) });
  put(mod, '03-spec/PRD.md', 'inna\n');
  const d = await c.diff(tag);
  assert.deepStrictEqual(d.files.map(f => f.file), ['03-spec/PRD.md']);
  const r = await c.restore(tag);
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(get(mod, '03-spec/PRD.md'), 'cel: A\nzakres: B\n');
  assert.ok(changes.length >= 1);
  c.stop();
});

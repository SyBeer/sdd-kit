// "Buduj" - interfejs (0.44.0, docs/specs/build.md AC-BD5).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ui = require('../ui.js');
const bd = require('../build.js');
const info = fs.readFileSync(path.join(__dirname, '..', 'info.html'), 'utf8');
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

test('AC-BD5: mlotek w naglowku za dyskietka, przed zebatka; nie w demo', () => {
  const h = ui.topbarHtml('panel', '', 'light');
  assert.match(h, /class="ic save"[\s\S]*?<\/button><button type="button" class="ic build"[^>]*aria-label="Buduj"[^>]*>[\s\S]*?<\/button><a class="ic cfg"/);
  assert.match(h, /class="ic build"[^>]*><svg[^>]*stroke="currentColor"/);
  assert.doesNotMatch(ui.topbarHtml('panel', '/demo', 'light'), /class="ic build"/);
});

test('AC-BD5: branchFor w przegladarce = na serwerze (podglad galezi)', () => {
  [['R-002', 'Import odczytów z CSV - cały plik albo nic'], ['', 'Popraw ekran logowania'], ['R-9', 'x'.repeat(200)], ['R-001', 'Łódź – żółć']].forEach(([id, t]) =>
    assert.strictEqual(ui.branchFor(id, t), bd.branchFor(id, t), id + ' ' + t));
});

test('AC-BD5: buildPopHtml - wybor zadania, wlasny opis, podglad galezi; w trakcie Zatrzymaj; bez gita', () => {
  const tasks = [{ id: 'R-001', title: 'Import <CSV>', status: 'zatwierdzone' }, { id: 'R-002', title: 'Raport', status: 'robocze' }];
  const idle = ui.buildPopHtml({ git: true, tasks, state: { status: 'idle' } }, '');
  assert.match(idle, /<select[^>]*id="bd-task"/);
  assert.match(idle, /<option value="0">R-001 Import &lt;CSV&gt; · zatwierdzone<\/option>/);
  assert.match(idle, /<option value="own">Własne zadanie…<\/option>/);
  assert.match(idle, /<input[^>]*id="bd-own"[^>]*hidden/);
  assert.match(idle, /id="bd-branch"[^>]*>feature\/r-001-import-csv</);
  assert.match(idle, /<button[^>]*id="bd-go"[^>]*>Buduj na nowej gałęzi<\/button>/);
  assert.match(text(idle), /autonomicznie/i);
  const last = ui.buildPopHtml({ git: true, tasks, state: { status: 'done', branch: 'feature/r-001-x' } }, '');
  assert.match(last, /href="\/build"/);
  assert.match(text(last), /Ostatnie budowanie: gotowe/);
  const run = ui.buildPopHtml({ git: true, tasks, state: { status: 'running', running: true, task: { id: 'R-001', title: 'Import' }, branch: 'feature/r-001-import' } }, '');
  assert.match(run, /<button[^>]*id="bd-stop"[^>]*>Zatrzymaj<\/button>/);
  assert.match(run, /<a href="\/build"[^>]*>Postęp budowania<\/a>/);
  assert.match(text(run), /feature\/r-001-import/);
  assert.doesNotMatch(run, /id="bd-go"/);
  assert.match(text(ui.buildPopHtml({ git: false, tasks: [], state: { status: 'idle' } }, '')), /repozytorium git/);
});

test('AC-BD5: Konfiguracja - karta Budowanie z promptem; strona /build', () => {
  ['id="budowanie"', 'id="f-bprompt"', 'id="bpsave"', 'id="bpreset"', '/api/build/prompt', '{zadanie}', 'build-prompt.md'].forEach(t => assert.ok(info.includes(t), t));
  assert.match(info, /\(module\|guide\|config\|build\)/);
  assert.match(info, /function renderBuild\(/);
  assert.match(info, /SddUI\.liveSource\(BASE\+'\/build-events'/);
  assert.match(info, /\/api\/build\/stop/);
});

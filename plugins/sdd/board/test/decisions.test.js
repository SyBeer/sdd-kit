// Decyzje tylko ze zrodla [Biz]. Kryteria: docs/specs/decisions.md (AC-DE1..AC-DE8, zmiana 0.30.1).
// Uruchom: node --test plugins/sdd/board/test/
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { readProgress } = require('../progress');
const { guide } = require('../info');

const ROOT = path.join(__dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const DEMO_REQ = path.join(ROOT, 'demo', 'zlecenia', 'requirements');

test('AC-DE1: CLAUDE.md - D tylko z [Biz], reszta jako A niepotwierdzone, zgoda nie zastepuje zrodla', () => {
  const c = read('templates/CLAUDE.md');
  assert.match(c, /`D-xxx`[^\n]*tylko[^\n]*`\[Biz\]`/);
  assert.match(c, /`\[App\]`\/`\[Dok\]`\/`\[AI\]`[^\n]*`A-xxx`[^\n]*`niepotwierdzone`/);
  assert.match(c, /[Zz]goda[^\n]*nie zastepuje zrodla/);
});

test('AC-DE2: szablon DECISIONS - Zrodlo obowiazkowo [Biz]', () => {
  const d = read('templates/requirements/01-interview/DECISIONS.md');
  assert.match(d, /^Zrodlo:.*\[Biz\].*obowiazkow/m);
});

test('AC-DE3: validate - kontrola 16 BLOCK dla D bez [Biz], numery 1-15 bez zmian', () => {
  const v = read('skills/validate/SKILL.md');
  assert.match(v, /^16\. BLOCK: D[^\n]*\[Biz\]/m);
  assert.match(v, /`\[B\]`/);  // stare oznaczenie liczy sie jak [Biz]
  assert.match(v, /^9\. WARN: pojecie uzyte w PRD/m);
  assert.match(v, /^15\. INFO:/m);
});

test('AC-DE4: interview - D tylko z odpowiedzi biznesu, potwierdzenie hurtowe i akceptacja as-built', () => {
  const s = read('skills/interview/SKILL.md');
  assert.match(s, /`D`[^\n]*tylko[^\n]*biznes/);
  assert.match(s, /[Pp]otwierdzenie hurtowe/);
  assert.match(s, /[Aa]kceptacja as-built/);
});

test('AC-DE5: intake - zamyka Q daje D tylko przy zrodle [Biz]', () => {
  const s = read('skills/intake/SKILL.md');
  const row = s.split('\n').find(l => l.startsWith('| `zamyka Q`'));
  assert.ok(row);
  assert.match(row, /`D-xxx` tylko[^|]*`\[Biz\]`/);
  assert.match(row, /`A`/);
});

test('AC-DE6: domain - nie tworzy D, fakt z kodu jako A niepotwierdzone', () => {
  const s = read('skills/domain/SKILL.md');
  assert.match(s, /[Nn]ie tworzysz `D-xxx`/);
  assert.match(s, /`A` `niepotwierdzone`/);
});

test('AC-DE7: demo - kazda D ze zrodlem [Biz], raport z wierszem 16 PASS, nadal 100%', () => {
  const d = fs.readFileSync(path.join(DEMO_REQ, '01-interview', 'DECISIONS.md'), 'utf8');
  const blocks = d.split(/^## /m).filter(b => /^D-\d+/.test(b));
  assert.ok(blocks.length > 10);
  blocks.forEach(b => {
    const src = (b.match(/^Zrodlo:(.*)$/m) || [])[1] || '';
    assert.match(src, /\[(Biz|B)\]/, 'D bez [Biz]: ' + b.split('\n')[0]);
  });
  const rep = fs.readFileSync(path.join(DEMO_REQ, '04-validation', 'validate-2026-09-27.md'), 'utf8');
  assert.match(rep, /^\| 16 \|[^\n]*\| PASS \|/m);
  const p = readProgress(DEMO_REQ);
  assert.strictEqual(p.stages.find(s => s.key === 'validate').counts.readiness, 100);
});

test('AC-DE8: przewodnik - decyzja tylko ze slow biznesu', () => {
  const g = JSON.stringify(guide());
  assert.match(g, /[Dd]ecyzj[^"]*tylko[^"]*\[Biz\]/);
});

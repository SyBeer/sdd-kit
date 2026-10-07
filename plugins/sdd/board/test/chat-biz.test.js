// Prostsze odpowiedzi w stylu BIZ i czystszy czat (0.38.1, docs/specs/interview-style.md AC-IS9..AC-IS11,
// docs/specs/claude-chat.md AC-CH9). Uwaga usera 2026-10-08: "dlaczego tak skomplikowanie odpowiedziales ... uprosc.
// Jezeli uzytkownik bedzie chcial, dopyta".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..');
const skill = fs.readFileSync(path.join(B, '..', 'skills', 'interview', 'SKILL.md'), 'utf8');
const chat = require('../chat');
const ui = require('../ui.js');

test('AC-IS9: BIZ - takze nowa decyzja jednym-dwoma zdaniami, pelny wpis tylko na prosbe', () => {
  assert.match(skill, /Tak samo przy nowej decyzji D/);
  assert.match(skill, /Pelny wpis \(rodzaj, tresc,\s+powod, kaskada\) pokazujesz tylko na prosbe/);
  assert.match(skill, /sposób rozliczenia miesiąca bierzemy z okresu obowiązującego 1\. dnia miesiąca/);
  assert.doesNotMatch(skill, /Pelny wpis \(rodzaj, tresc, kaskada, powod\) pokazujesz tylko, gdy cos sie dzieje/);
});

test('AC-IS10: BIZ - nowe pytania i kaskada bez komentarza; sprzecznosc jednym zdaniem', () => {
  assert.match(skill, /Nowe pytania odlozone na pozniej, kaskade i numery zapisujesz bez komentarza/);
  assert.match(skill, /sprzecznosc z wczesniejsza decyzja albo obalenie zalozenia: jednym zdaniem/i);
});

test('AC-IS11: wznowiona rozmowa - nie powtarzasz pytania z odpowiedzia w sesji', () => {
  assert.match(skill, /Wznowiona rozmowa[^\n]*session-[^\n]*nie pytasz drugi raz/);
});

test('AC-CH9: czat - po polsku, bez komentowania krokow, odczyt przez proste polecenia, czytelne odrzucenia', () => {
  assert.match(chat.STYLE_PROMPT.biz, /po polsku/);
  assert.match(chat.STYLE_PROMPT.biz, /Nie opisuj swoich krokow/);
  ['Bash(grep:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(wc:*)', 'Bash(cd:*)'].forEach(t => assert.ok(chat.ALLOWED.includes(t), t));
  assert.ok(!chat.ALLOWED.some(t => /Bash\((rm|mv|node|curl|python)/.test(t)));
  // polecenie powloki w podsumowaniu bez tresci (pelne w podpowiedzi), odrzucenie po polsku, "</>" escapowane
  assert.strictEqual(ui.toolSummary([{ kind: 'tool', name: 'Bash', target: 'cd /x && grep a b' }, { kind: 'tool', name: 'Read', target: 'A.md' }]),
    'odczyt 1 pliku · 1 polecenie');
  const src = fs.readFileSync(path.join(B, 'ui.js'), 'utf8');
  assert.doesNotMatch(src, /terminalu \(<\/>\)/);
  assert.match(src, /pominięto polecenie spoza czatu/);
});

test('AC-IS15: BIZ - parafraza jest pytaniem; "tak" = zapis bez komentarza, inna odpowiedz = dopytanie', () => {
  assert.match(skill, /Parafraza jest pytaniem/);
  assert.match(skill, /"tak"[^\n]*zapisujesz[^\n]*bez komentarza/);
  assert.match(skill, /"nie" albo inna odpowiedz[^\n]*dopytujesz/);
  assert.match(skill, /Nie musisz ich mieć w obliczeniach\? \(Q-049\)/);
  assert.doesNotMatch(skill, /Z tego robie nowa decyzje|Zapisuj[eę]\? \(Q-048\)/);
});

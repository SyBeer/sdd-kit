#!/usr/bin/env node
// Odcisk wymagan (zmiana 0.18.0): sha256 z plikow, ktore sprawdza /sdd:validate. Kryteria: docs/specs/progress-ui.md (AC-59..AC-62).
// Raport walidacji zapisuje go w linii "Odcisk wymagan: sha256:<hex>"; panel liczy biezacy i porownuje -
// inny odcisk = wymagania zmienily sie po walidacji. Tresc, nie daty plikow (git checkout i kopiowanie zmieniaja daty).
// Uruchom: node fingerprint.js <katalog requirements>
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Co sie liczy: prawda o wymaganiach. Poza: board.json (widok), sesje i rundy, CHANGELOG, 04-validation, 03-spec/agent (generowane), surowiec.
const FILES = ['SDD.yaml', '00-intake/INDEX.md', '01-interview/QUESTIONS.md', '01-interview/DECISIONS.md', '01-interview/ASSUMPTIONS.md'];
const DIRS = ['02-domain', '03-spec'];

function tracked(req) {
  const out = FILES.filter(f => fs.existsSync(path.join(req, f)));
  DIRS.forEach(d => {
    let names = [];
    try { names = fs.readdirSync(path.join(req, d), { withFileTypes: true }); } catch (e) { /* brak */ }
    names.filter(e => e.isFile() && /\.md$/.test(e.name)).forEach(e => out.push(d + '/' + e.name));
  });
  return out.sort();
}

function fingerprint(req) {
  const h = crypto.createHash('sha256');
  tracked(req).forEach(rel => {
    h.update(rel + '\n');
    h.update(fs.readFileSync(path.join(req, rel), 'utf8').replace(/\r\n/g, '\n'));
    h.update('\n\0\n');
  });
  return 'sha256:' + h.digest('hex');
}

module.exports = { fingerprint, tracked };

if (require.main === module) {
  const req = path.resolve(process.argv[2] || 'requirements');
  if (!fs.existsSync(req)) { console.error('Nie ma katalogu ' + req); process.exit(1); }
  console.log(fingerprint(req));
}

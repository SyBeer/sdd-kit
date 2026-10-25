// Tresc skilla do testow (0.46.2, docs/specs/skill-bodies.md AC-SB9): SKILL.md razem z references/*.md -
// rzadkie sekcje leza w references/ i laduja sie tylko, gdy sa potrzebne, ale zachowanie opisuja te same zdania.
const fs = require('fs');
const path = require('path');
const SK = path.join(__dirname, '..', '..', 'skills');

function skillText(name) {
  const dir = path.join(SK, name), ref = path.join(dir, 'references');
  let refs = [];
  try { refs = fs.readdirSync(ref).filter(f => f.endsWith('.md')).sort(); } catch (e) { /* bez references/ */ }
  return [fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')]
    .concat(refs.map(f => fs.readFileSync(path.join(ref, f), 'utf8'))).join('\n');
}

module.exports = { skillText, SK };

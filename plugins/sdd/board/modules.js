// Moduly (osobne foldery z requirements/) i zalaczniki do 00-intake/.
// Kryteria: docs/specs/progress-ui.md, zmiana 0.3.0.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TEMPLATES = path.join(__dirname, '..', 'templates');
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function yamlField(text, key) {
  const m = text.match(new RegExp('^' + key + ':\\s*"?([^"#\\n]*?)"?\\s*(#.*)?$', 'm'));
  return m ? m[1].trim() : '';
}

function listModules(root) {
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return []; }
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => {
      const dir = path.join(root, e.name);
      const yamlFile = path.join(dir, 'requirements', 'SDD.yaml');
      if (!fs.existsSync(yamlFile)) return null;
      const yaml = fs.readFileSync(yamlFile, 'utf8');
      const project = yamlField(yaml, 'project');
      return {
        name: e.name, dir,
        project: /<[^>]+>/.test(project) || !project ? e.name : project,
        level: yamlField(yaml, 'level') || 'full',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const q = s => '"' + String(s).replace(/["\\\n]/g, ' ').trim() + '"';

function createModule(root, { name, level, approver, sponsor }, opts = {}) {
  if (!NAME_RE.test(name || '')) throw new Error('Zla nazwa modulu: male litery, cyfry i myslnik, np. "faktury-2026".');
  if (level !== 'full' && level !== 'light') throw new Error('Zly poziom: full albo light.');
  const dir = path.join(root, name);
  if (fs.existsSync(dir)) throw new Error('Folder ' + dir + ' juz istnieje.');

  const req = path.join(dir, 'requirements');
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(TEMPLATES, 'requirements'), req, { recursive: true });
  fs.rmSync(path.join(req, '03-spec', level === 'light' ? 'PRD.md' : 'SPEC.md'), { force: true });
  fs.copyFileSync(path.join(TEMPLATES, 'CLAUDE.md'), path.join(dir, 'CLAUDE.md'));

  let owners = '  - role: ' + q(approver || 'wlasciciel procesu') + '\n    approves: [R, D, GLOSSARY, BR]\n';
  if (sponsor && sponsor.trim()) owners += '  - role: ' + q(sponsor) + '\n    approves: [PRD]\n';
  const yamlFile = path.join(req, 'SDD.yaml');
  const yaml = fs.readFileSync(yamlFile, 'utf8')
    .replace(/^project:.*$/m, 'project: ' + q(name))
    .replace(/^level:\s*\w+/m, 'level: ' + level)
    .replace(/^(owners:.*\n)(?:[ \t]+.*\n)*/m, '$1' + owners);
  fs.writeFileSync(yamlFile, yaml);

  const today = new Date().toISOString().slice(0, 10);
  fs.appendFileSync(path.join(req, 'CHANGELOG.md'), today + ' | init | utworzono strukture, poziom ' + level + ' | panel\n');

  if (opts.git !== false) spawnSync('git', ['init', '-q', '-b', 'main'], { cwd: dir, stdio: 'ignore' });
  return dir;
}

function cleanName(original) {
  let base = path.basename(String(original || '').replace(/\\/g, '/'));
  base = base.normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}._-]/gu, '_')
    .replace(/^[.\-_]+/, '')
    .slice(0, 120);
  return base || 'plik';
}

function saveIntake(reqDir, original, buffer) {
  const dir = path.join(reqDir, '00-intake');
  fs.mkdirSync(dir, { recursive: true });
  const name = cleanName(original);
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  let candidate = name, i = 0;
  while (fs.existsSync(path.join(dir, candidate))) candidate = stem + '-' + (++i) + ext;
  fs.writeFileSync(path.join(dir, candidate), buffer, { flag: 'wx' });
  return candidate;
}

module.exports = { listModules, createModule, saveIntake, cleanName, NAME_RE };

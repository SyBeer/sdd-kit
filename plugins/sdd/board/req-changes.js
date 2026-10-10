'use strict';
// "Co się zmieniło w wymaganiach" (0.42.0, docs/specs/version-summary.md): zmiany wersji po kluczach, nie po liniach.
// Tablica - karteczki po id i procesy; pliki .md - wiersze tabel (klucz = pierwsza komorka) i bloki z naglowkiem
// (klucz = ID na poczatku naglowka albo jego tekst). Czyste funkcje, bez gita.
const path = require('path');

// ---------------------------------------------------------------- tablica
const NOTE_SKIP = new Set(['id', 'col', 'created', 'updated', 'synced', 'by']);
const NOTE_OWN = new Set(['lane', 'text', 'type']);
function parseBoard(t) {
  if (!String(t || '').trim()) return { notes: [], lanes: [] };
  try { const b = JSON.parse(t); return b && typeof b === 'object' ? b : null; } catch (e) { return null; }
}
function boardChanges(oldText, newText) {
  const a = parseBoard(oldText), b = parseBoard(newText);
  if (!a || !b) return [];
  const out = [];
  ['title', 'subtitle'].forEach(k => { if ((a[k] || '') !== (b[k] || '') && (a[k] || b[k])) out.push({ type: 'title', change: k, from: a[k] || '', to: b[k] || '' }); });
  const la = a.lanes || [], lb = b.lanes || [];
  lb.filter(l => !la.includes(l)).forEach(name => out.push({ type: 'lane', change: 'added', name }));
  la.filter(l => !lb.includes(l)).forEach(name => out.push({ type: 'lane', change: 'removed', name }));
  const old = new Map((a.notes || []).map(n => [n.id, n]));
  const seen = new Set();
  (b.notes || []).forEach(n => {
    const o = old.get(n.id);
    seen.add(n.id);
    if (!o) { out.push({ type: 'note', change: 'added', text: n.text || '', noteType: n.type || '', lane: n.lane || '' }); return; }
    if ((o.lane || '') !== (n.lane || '')) out.push({ type: 'note', change: 'moved', text: n.text || '', noteType: n.type || '', from: o.lane || '', to: n.lane || '' });
    if ((o.text || '') !== (n.text || '')) out.push({ type: 'note', change: 'text', noteType: n.type || '', from: o.text || '', to: n.text || '' });
    if ((o.type || '') !== (n.type || '')) out.push({ type: 'note', change: 'type', text: n.text || '', from: o.type || '', to: n.type || '' });
    const keys = Array.from(new Set(Object.keys(o).concat(Object.keys(n)))).filter(k => !NOTE_SKIP.has(k) && !NOTE_OWN.has(k));
    const fields = keys.filter(k => JSON.stringify(o[k]) !== JSON.stringify(n[k]));
    if (fields.length) out.push({ type: 'note', change: 'fields', text: n.text || '', fields });
  });
  (a.notes || []).filter(n => !seen.has(n.id)).forEach(n => out.push({ type: 'note', change: 'removed', text: n.text || '', noteType: n.type || '', lane: n.lane || '' }));
  return out;
}

// ---------------------------------------------------------------- pliki .md
const ID = /^([A-Z]{1,3}-(?:\d+|x+))\b/;
const isTemplate = key => /-x+$/i.test(key);
const isRow = l => /^\s*\|.*\|\s*$/.test(l);
const isSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const short = s => { s = norm(s); return s.length > 80 ? s.slice(0, 80).replace(/\s+\S*$/, '') + '…' : s; };
const FIELD = /^([^\s:|#>*`-][^:|]{0,39}):(?:\s+(.*)|$)/;

// Wpisy pliku w kolejnosci wystapienia: { key, title, fields: Map(nazwa -> wartosc) }
function entries(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [], count = {};
  const add = (key, title, fields) => {
    count[key] = (count[key] || 0) + 1;
    out.push({ key: count[key] > 1 ? key + ' #' + count[key] : key, title, fields });
  };
  let block = null, field = null, fence = false, header = null;
  const put = (name, v) => { block.fields.set(name, (block.fields.has(name) ? block.fields.get(name) + '\n' : '') + v); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!fence && isRow(l)) {
      if (isSep(l)) continue;
      if (i + 1 < lines.length && isSep(lines[i + 1])) { header = cells(l); continue; }
      const c = cells(l);
      if (header && c[0] && !isTemplate(c[0])) {
        const f = new Map();
        header.forEach((h, j) => { if (j > 0) f.set(h || 'kolumna ' + (j + 1), norm(c[j])); });
        add(c[0].replace(/\*\*/g, ''), short(c[1]), f);
      }
      continue;
    }
    if (!isRow(l)) header = null;
    const h = !fence && l.match(/^#{1,4}\s+(.*)$/);
    if (h) {
      const t = norm(h[1]), m = t.match(ID);
      let key = t, title = '';
      if (m) { key = m[1]; const rest = t.slice(m[1].length).trim(); title = rest.includes('|') ? rest.split('|').pop().trim() : rest; }
      block = isTemplate(key) ? { skip: true, fields: new Map() } : { key, title, fields: new Map() };
      if (!block.skip) add(key, title, block.fields);
      field = null;
      continue;
    }
    if (!block) block = { skip: true, fields: new Map() };
    if (/^\s*```/.test(l)) { fence = !fence; field = 'diagram'; put('diagram', ''); continue; }
    if (fence) { put('diagram', l); continue; }
    if (!l.trim()) continue;
    const f = l.match(FIELD);
    if (f) { field = norm(f[1]); put(field, norm(f[2])); continue; }
    put(field || 'treść', norm(l));
  }
  out.forEach(e => e.fields.forEach((v, k) => e.fields.set(k, norm(v))));
  return out;
}

function mdChanges(oldText, newText) {
  const a = entries(oldText), b = entries(newText);
  const old = new Map(a.map(e => [e.key, e])), seen = new Set(), out = [];
  b.forEach(e => {
    seen.add(e.key);
    const o = old.get(e.key);
    if (!o) { out.push({ type: 'entry', change: 'added', key: e.key, title: e.title, fields: [] }); return; }
    const names = Array.from(e.fields.keys()).concat(Array.from(o.fields.keys()).filter(k => !e.fields.has(k)));
    const fields = names.filter(k => (o.fields.get(k) || '') !== (e.fields.get(k) || '')).map(k =>
      /^status$/i.test(k) ? { name: k, from: o.fields.get(k) || '', to: e.fields.get(k) || '' } : { name: k });
    if (fields.length) out.push({ type: 'entry', change: 'changed', key: e.key, title: e.title || o.title, fields });
  });
  a.filter(e => !seen.has(e.key)).forEach(e => out.push({ type: 'entry', change: 'removed', key: e.key, title: e.title, fields: [] }));
  return out;
}

// ---------------------------------------------------------------- plik -> grupa i elementy
const MD_GROUPS = ['QUESTIONS', 'DECISIONS', 'ASSUMPTIONS', 'GLOSSARY', 'RULES', 'ENTITIES', 'SYSTEMS', 'ACTORS', 'PRD'];
function fileChanges(file, oldText, newText, status) {
  const base = path.basename(file);
  if (base === 'board.json') return { file, group: 'board', items: boardChanges(oldText, newText) };
  const g = base.replace(/\.md$/i, '').toUpperCase();
  if (/\.md$/i.test(base) && MD_GROUPS.includes(g)) return { file, group: g, items: mdChanges(oldText, newText) };
  return { file, group: 'other', items: [{ type: 'file', change: status || 'changed' }] };
}

module.exports = { boardChanges, mdChanges, fileChanges, entries };

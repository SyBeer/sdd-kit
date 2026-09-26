// Operacje na procesach (pasach) tablicy. Wspolne dla przegladarki (window.BoardOps) i testow (require).
// Kryteria: docs/specs/board-ui.md. Proces identyfikuje nazwa, karteczka wskazuje go polem `lane`.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoardOps = factory();
})(this, function () {
  'use strict';

  function lanes(b) { if (!Array.isArray(b.lanes)) b.lanes = []; return b.lanes; }
  function notes(b) { if (!Array.isArray(b.notes)) b.notes = []; return b.notes; }
  function clean(name) { return String(name == null ? '' : name).replace(/\s+/g, ' ').trim(); }

  function addLane(b, name) {
    const l = lanes(b);
    let n = clean(name);
    if (n) {
      if (l.indexOf(n) >= 0) throw new Error('Proces „' + n + '” już jest.');
    } else {
      n = 'Nowy proces';
      for (let i = 2; l.indexOf(n) >= 0; i++) n = 'Nowy proces ' + i;
    }
    l.push(n);
    return n;
  }

  function renameLane(b, from, to) {
    const l = lanes(b), i = l.indexOf(from), n = clean(to);
    if (i < 0) throw new Error('Nie ma procesu „' + from + '”.');
    if (!n) throw new Error('Nazwa procesu nie może być pusta.');
    if (n === from) return n;
    if (l.indexOf(n) >= 0) throw new Error('Proces „' + n + '” już jest.');
    l[i] = n;
    notes(b).forEach(function (x) { if (x.lane === from) x.lane = n; });
    return n;
  }

  function moveLane(b, name, dir) {
    const l = lanes(b), i = l.indexOf(name), j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= l.length) return;
    l[i] = l[j]; l[j] = name;
  }

  function countNotes(b, name) {
    return notes(b).filter(function (x) { return x.lane === name; }).length;
  }

  function deleteLane(b, name) {
    const removed = countNotes(b, name);
    b.lanes = lanes(b).filter(function (x) { return x !== name; });
    b.notes = notes(b).filter(function (x) { return x.lane !== name; });
    return removed;
  }

  function nextCol(b, name) {
    const cols = notes(b).filter(function (x) { return x.lane === name; }).map(function (x) { return x.col || 0; });
    return cols.length ? Math.max.apply(null, cols) + 1 : 0;
  }

  // Kolejnosc karteczek w kolumnie = kolejnosc w notes[].
  function sameCol(n, lane, col) { return n.lane === lane && (n.col || 0) === col; }

  function moveNote(b, id, lane, col, beforeId) {
    const list = notes(b), i = list.findIndex(function (x) { return x.id === id; });
    if (i < 0 || beforeId === id) return;
    const n = list.splice(i, 1)[0];
    n.lane = lane; n.col = col;
    let at = beforeId ? list.findIndex(function (x) { return x.id === beforeId; }) : -1;
    if (at < 0) {
      at = list.length;
      for (let k = list.length - 1; k >= 0; k--) if (sameCol(list[k], lane, col)) { at = k + 1; break; }
    }
    list.splice(at, 0, n);
  }

  function stepNote(b, id, dir) {
    const list = notes(b), n = list.find(function (x) { return x.id === id; });
    if (!n) return;
    const idx = [];
    list.forEach(function (x, k) { if (sameCol(x, n.lane, n.col || 0)) idx.push(k); });
    const p = idx.indexOf(list.indexOf(n)), q = p + (dir < 0 ? -1 : 1);
    if (q < 0 || q >= idx.length) return;
    const a = idx[p], c = idx[q], t = list[a]; list[a] = list[c]; list[c] = t;
  }

  // Daty karteczek (ISO): nowe dostaja created/updated, zmienione - updated. Daty podane w `next` (agent, klient) zostaja.
  const TRACKED = ['text', 'type', 'lane', 'col', 'ref'];
  function changed(a, b) {
    return TRACKED.some(function (k) {
      const x = k === 'col' ? (a[k] || 0) : (a[k] == null ? '' : a[k]);
      const y = k === 'col' ? (b[k] || 0) : (b[k] == null ? '' : b[k]);
      return x !== y;
    });
  }
  function stampNotes(prev, next, now) {
    const old = {};
    notes(prev || {}).forEach(function (n) { old[n.id] = n; });
    notes(next).forEach(function (n) {
      const p = old[n.id];
      if (!p) { n.created = n.created || now; n.updated = n.updated || now; return; }
      if (!n.created && p.created) n.created = p.created;
      if (changed(p, n) && n.updated === p.updated) n.updated = now;
      else if (!n.updated && p.updated) n.updated = p.updated;
    });
    return next;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const z = function (v) { return (v < 10 ? '0' : '') + v; };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  // Stan synchronizacji z plikami: board (tylko na tablicy), changed (zmieniona po sync), missing (ID nie ma w pliku), synced.
  function syncState(n, inFile) {
    if (!n.synced) return 'board';
    const s = new Date(n.synced).getTime(), u = n.updated ? new Date(n.updated).getTime() : NaN;
    if (!isNaN(u) && !isNaN(s) && u > s) return 'changed';
    if (inFile === false) return 'missing';
    return 'synced';
  }

  // readFile(sciezka wzgledem requirements/) -> tresc albo null. Kazdy plik czytany raz.
  function syncMap(b, readFile) {
    const cache = {}, out = {};
    const text = function (f) { if (!(f in cache)) cache[f] = readFile(f); return cache[f]; };
    notes(b).forEach(function (n) {
      let inFile = null;
      if (n.synced && n.ref && n.file) {
        const t = text(n.file);
        const re = new RegExp('(^|[^A-Za-z0-9-])' + String(n.ref).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9-])');
        inFile = t == null ? false : re.test(t);
      } else if (n.synced && n.file) {
        inFile = text(n.file) == null ? false : null;
      }
      out[n.id] = syncState(n, inFile);
    });
    return out;
  }

  // Wskazowka na pustej tablicy: 'blank' (brak procesow), 'nonotes' (procesy bez karteczek), null.
  function boardHint(b) {
    if (notes(b).length) return null;
    return lanes(b).length ? 'nonotes' : 'blank';
  }

  return { boardHint, addLane, renameLane, moveLane, deleteLane, countNotes, nextCol, moveNote, stepNote, stampNotes, fmtDate, syncState, syncMap };
});

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

  // Wstawienie kolumny: karteczki procesu od `col` w prawo przesuwaja sie o 1 (AC-B27).
  function insertCol(b, lane, col) {
    let moved = 0;
    notes(b).forEach(function (n) { if (n.lane === lane && (n.col || 0) >= col) { n.col = (n.col || 0) + 1; moved++; } });
    return moved;
  }

  // Pusta kolumna procesu znika - dalsze o 1 w lewo (AC-B30). Kolumna zajeta: nic.
  function closeCol(b, lane, col) {
    if (notes(b).some(function (n) { return n.lane === lane && (n.col || 0) === col; })) return 0;
    let moved = 0;
    notes(b).forEach(function (n) { if (n.lane === lane && (n.col || 0) > col) { n.col = (n.col || 0) - 1; moved++; } });
    return moved;
  }

  // Przeniesienie z przegladarki (AC-B31): opcjonalnie nowa kolumna (newCol), miejsce przed `before`,
  // potem zamkniecie kolumny, z ktorej karteczka wyszla, jesli zostala pusta.
  function placeNote(b, id, lane, col, opt) {
    opt = opt || {};
    const n = notes(b).find(function (x) { return x.id === id; });
    if (!n) return;
    const from = { lane: n.lane, col: n.col || 0 };
    if (opt.newCol) { insertCol(b, lane, col); if (from.lane === lane && from.col >= col) from.col++; }
    moveNote(b, id, lane, col, opt.before);
    n._moved = true;
    closeCol(b, from.lane, from.col);
  }

  // Kopia karteczki (AC-B50): tresc, typ, proces; bez ref, synchronizacji i odpowiedzi - numer w plikach ma oryginal.
  // Bez dest - zaraz pod oryginalem; dest {lane, col, before, newCol} - we wskazanym miejscu (Option+przeciagniecie).
  function copyNote(b, id, now, dest) {
    const list = notes(b), n = list.find(function (x) { return x.id === id; });
    if (!n) return null;
    const base = 'n' + Date.now().toString(36) + 'c';
    let nid = base, k = 2;
    while (list.some(function (x) { return x.id === nid; })) nid = base + (k++);
    const c = { id: nid, type: n.type, text: n.text, lane: n.lane, col: n.col || 0, by: 'człowiek',
      source: (n.source ? n.source + ' ' : '') + '(kopia)', created: now, updated: now };
    if (n.target === true) c.target = true;  // kopia docelowej jest docelowa (0.36.0, AC-BT2)
    if (!dest) { list.splice(list.indexOf(n) + 1, 0, c); return nid; }
    if (dest.newCol) insertCol(b, dest.lane, dest.col);
    c.lane = dest.lane; c.col = dest.col;
    list.push(c);
    moveNote(b, nid, dest.lane, dest.col, dest.before);
    return nid;
  }

  function removeNote(b, id) {
    const n = notes(b).find(function (x) { return x.id === id; });
    if (!n) return;
    b.notes = notes(b).filter(function (x) { return x !== n; });
    closeCol(b, n.lane, n.col || 0);
  }

  // Daty karteczek (ISO): nowe dostaja created/updated, zmienione - updated. Daty podane w `next` (agent, klient) zostaja.
  // Przeniesienie liczy sie tylko z oznaczeniem `_moved` (przegladarka, placeNote) - sam numer `col` zmieniony przez
  // wstawienie albo zamkniecie kolumny to uklad, nie zmiana (AC-B28). `_moved` nie trafia do pliku.
  const TRACKED = ['text', 'type', 'lane', 'ref', 'answer', 'answeredBy', 'target']; // odpowiedz na pytanie tez (AC-B46)
  function changed(a, b) {
    return TRACKED.some(function (k) {
      return (a[k] == null ? '' : a[k]) !== (b[k] == null ? '' : b[k]);
    });
  }
  // Zmiana nazwy procesu (renameLane) to uklad, nie zmiana karteczek (AC-B39): stara nazwa znika z `lanes`,
  // nowa stoi na tym samym miejscu i wczesniej jej nie bylo. Zwraca mape stara -> nowa nazwa.
  function laneRenames(prev, next) {
    const a = lanes(prev || {}), b = lanes(next), map = {};
    a.forEach(function (from, i) {
      const to = b[i];
      if (to !== undefined && to !== from && b.indexOf(from) < 0 && a.indexOf(to) < 0) map[from] = to;
    });
    return map;
  }
  function stampNotes(prev, next, now) {
    const old = {}, renamed = laneRenames(prev, next);
    notes(prev || {}).forEach(function (n) { old[n.id] = n; });
    notes(next).forEach(function (n) {
      const p = old[n.id], moved = n._moved === true;
      delete n._moved;
      if (!p) { n.created = n.created || now; n.updated = n.updated || now; return; }
      if (!n.created && p.created) n.created = p.created;
      const q = renamed[p.lane] === n.lane ? Object.assign({}, p, { lane: n.lane }) : p;
      if ((moved || changed(q, n)) && n.updated === p.updated) n.updated = now;
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
    if (n.type === 'space') return 'space'; // odstep to uklad tablicy, nie trafia do plikow (AC-B33)
    if (!n.synced) return 'board';
    const s = new Date(n.synced).getTime(), u = n.updated ? new Date(n.updated).getTime() : NaN;
    if (!isNaN(u) && !isNaN(s) && u > s) return 'changed';
    if (inFile === false) return 'missing';
    return 'synced';
  }

  // Stan do narysowania karteczki (AC-B35): zawsze jeden ze znanych. Stan z serwera moze byc nieaktualny
  // (np. odstep wlasnie zmieniony na zdarzenie ma jeszcze 'space') - wtedy 'board' do czasu przeliczenia.
  const STATES = ['synced', 'changed', 'missing', 'board'];
  function noteSync(n, map) {
    if (n.type === 'space') return 'space';
    const st = map && map[n.id];
    return STATES.indexOf(st) >= 0 ? st : 'board';
  }

  // Pytania z pliku na tablicy (AC-B41..AC-B43). Pytanie bez miejsca w procesie trafia do procesu "Do wyjaśnienia".
  const QLANE = 'Do wyjaśnienia';
  function plain(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').trim().toLowerCase(); }
  function isQuestionsLane(name) { return plain(name) === 'do wyjasnienia'; }
  function refTokens(n) { return String(n.ref || '').split(/[\s,;]+/).filter(Boolean); }
  const PENDING = ['open', 'asked', 'conflicting'];
  function missingQuestions(b, qs) {
    if (!qs) return [];
    const on = {};
    notes(b).forEach(function (n) { refTokens(n).forEach(function (t) { on[t] = true; }); });
    return Object.keys(qs).filter(function (id) { return PENDING.indexOf(qs[id].kind) >= 0 && !on[id]; })
      .sort(function (a, b2) { return a.localeCompare(b2, undefined, { numeric: true }); })
      .map(function (id) { return Object.assign({ id: id }, qs[id]); });
  }
  function placeQuestions(b, missing, now) {
    let added = 0;
    (missing || []).forEach(function (q) {
      let lane = null, col = 0;
      const refs = q.refs || [];
      for (let i = 0; i < refs.length && !lane; i++) {
        const hit = notes(b).find(function (n) { return n.type !== 'hot' && refTokens(n).indexOf(refs[i]) >= 0; });
        if (hit) { lane = hit.lane; col = hit.col || 0; }
      }
      if (!lane) {
        lane = lanes(b).find(isQuestionsLane);
        if (!lane) { lane = QLANE; lanes(b).push(lane); }
        col = nextCol(b, lane);
      }
      let id = 'q' + String(q.id).toLowerCase().replace(/[^a-z0-9]/g, ''), k = 2;
      while (notes(b).some(function (n) { return n.id === id; })) id = id.replace(/_\d+$/, '') + '_' + (k++);
      notes(b).push({ id: id, type: 'hot', text: q.text || q.id, lane: lane, col: col, ref: q.id,
        source: '01-interview/QUESTIONS.md', file: '01-interview/QUESTIONS.md', by: 'agent',
        created: now, updated: now, synced: now });
      added++;
    });
    return added;
  }
  function closedQuestion(n, qs) {
    if (!qs || n.type !== 'hot') return null;
    const q = qs[n.ref];
    if (!q) return null;
    if (q.kind === 'answered') return 'zamknięte' + (q.closedBy ? ': ' + q.closedBy : '');
    if (q.kind === 'parked') return 'zaparkowane';
    return null;
  }

  // Odpowiedzi na tablicy (AC-B47, AC-B48): tablica zbiera, do plikow wpisuje agent (/sdd:board sync).
  function answerState(n, qs) {
    if (n.type !== 'hot' || !String(n.answer || '').trim()) return null;
    const q = qs && qs[n.ref];
    return q && PENDING.indexOf(q.kind) < 0 ? 'recorded' : 'pending';
  }
  function pendingAnswers(b, qs) { return notes(b).filter(function (n) { return answerState(n, qs) === 'pending'; }); }
  function questionOrder(b, qs) {
    const group = function (n) {
      const q = qs && qs[n.ref];
      if (q && PENDING.indexOf(q.kind) < 0) return 6;          // zamkniete w pliku
      if (String(n.answer || '').trim()) return 5;              // odpowiedziane na tablicy
      if (!q) return 4;                                        // pytanie z warsztatu, spoza pliku
      if (q.kind === 'conflicting') return 0;
      if (q.blocking) return 1;
      return q.kind === 'asked' ? 2 : 3;
    };
    const list = notes(b).filter(function (n) { return n.type === 'hot'; })
      .map(function (n, i) { return { n: n, g: group(n), i: i }; });
    list.sort(function (a, c) {
      return a.g - c.g || String(a.n.ref || '').localeCompare(String(c.n.ref || ''), undefined, { numeric: true }) || a.i - c.i;
    });
    return list.map(function (x) { return x.n.id; });
  }

  // Podmiana tablicy (AC-B37): karta pamieta plik z pierwszego wczytania; inny `_file` = serwer pokazuje inna tablice.
  function boardSwitched(known, b) {
    const f = b && b._file;
    if (!known || !f || f === known) return null;
    return { from: known, to: f };
  }

  // readFile(sciezka wzgledem requirements/) -> tresc albo null. Kazdy plik czytany raz.
  function syncMap(b, readFile) {
    const cache = {}, out = {};
    const text = function (f) { if (!(f in cache)) cache[f] = readFile(f); return cache[f]; };
    notes(b).forEach(function (n) {
      if (n.type === 'space') { out[n.id] = 'space'; return; }
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

  // Cofnij / Ponow (AC-B19, AC-B20). Stan = board.json bez pol `_` (serwer dopisuje je do widoku).
  // Klucz tresci pomija daty updated tablicy i created/updated karteczek - roznia sie w echu wlasnego zapisu, bo nadaje je serwer.
  function snap(b) {
    return JSON.stringify(b, function (k, v) { return k.charAt(0) === '_' ? undefined : v; }); // takze _moved karteczek
  }
  function keyOf(s) {
    const b = JSON.parse(s);
    delete b.updated;
    notes(b).forEach(function (n) { delete n.created; delete n.updated; });
    return JSON.stringify(b);
  }
  function createHistory(limit) {
    const max = limit || 50;
    let base = null, undos = [], redos = [], pending = [];
    function sent(s) { pending.push(keyOf(s)); if (pending.length > max) pending.shift(); }
    return {
      reset: function (b) { base = snap(b); undos = []; redos = []; pending = []; },
      record: function (b) {
        const s = snap(b);
        if (base !== null && keyOf(s) === keyOf(base)) return false;
        if (base !== null) { undos.push(base); if (undos.length > max) undos.shift(); }
        redos = []; base = s; sent(s);
        return true;
      },
      undo: function () {
        if (!undos.length) return null;
        redos.push(base); base = undos.pop(); sent(base);
        return JSON.parse(base);
      },
      redo: function () {
        if (!redos.length) return null;
        undos.push(base); base = redos.pop(); sent(base);
        return JSON.parse(base);
      },
      // Tablica przyszla z serwera: 'echo' (wlasny zapis), 'same' (bez zmian), 'external' (ktos inny - historia pusta).
      incoming: function (b) {
        const s = snap(b), k = keyOf(s), i = pending.indexOf(k);
        if (i >= 0) { pending.splice(0, i + 1); if (!pending.length) base = s; return 'echo'; }
        if (base !== null && k === keyOf(base)) { base = s; return 'same'; }
        undos = []; redos = []; pending = []; base = s;
        return 'external';
      },
      canUndo: function () { return undos.length > 0; },
      canRedo: function () { return redos.length > 0; },
      waiting: function () { return pending.length > 0; },
    };
  }

  // Eksport do PDF (0.35.0, docs/specs/board-pdf.md AC-BP2): jedna strona o rozmiarze calej tablicy + 24 px marginesu.
  function boardPageSize(w, h) {
    const side = function (v, min) { v = Number(v); return Math.max(min, Math.ceil((isFinite(v) && v > 0 ? v : 0) + 48)); };
    const W = side(w, 400), H = side(h, 300);
    return { w: W, h: H, css: '@page{size:' + W + 'px ' + H + 'px;margin:0}' };
  }

  // Procesy docelowe (0.36.0, docs/specs/board-target.md AC-BT1): karteczka z target: true = jeszcze nie ma w aplikacji.
  // Proces docelowy = wszystkie jego karteczki (bez odstepow) docelowe; osobnego pola w lanes nie ma.
  const VIEWS = ['dzis', 'docelowo', 'oba'];
  function isTarget(n) { return !!n && n.target === true; }
  function targetLane(b, lane) {
    const l = notes(b).filter(function (n) { return n.lane === lane && n.type !== 'space'; });
    return l.length > 0 && l.every(isTarget);
  }
  function countTarget(b) { return notes(b).filter(function (n) { return n.type !== 'space' && isTarget(n); }).length; }
  function viewOf(stored) { return VIEWS.indexOf(stored) >= 0 ? stored : 'oba'; }

  return { VIEWS, isTarget, targetLane, countTarget, viewOf, boardPageSize, boardHint, addLane, renameLane, moveLane, deleteLane, countNotes, nextCol, moveNote, stepNote, insertCol, closeCol, placeNote, copyNote, removeNote, stampNotes, fmtDate, syncState, syncMap, noteSync, boardSwitched, isQuestionsLane, missingQuestions, placeQuestions, closedQuestion, QLANE, answerState, pendingAnswers, questionOrder, createHistory };
});

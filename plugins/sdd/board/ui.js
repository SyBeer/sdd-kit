// Naglowek wszystkich stron: zakladki, przelacznik modulu, motyw jasny / ciemny (☾ / ☀), Konfiguracja (⚙), okno Claude.
// Wspolny dla przegladarki (window.SddUI) i testow (require). Kryteria: docs/specs/ui-switch.md.
// W przegladarce ladowany w <head> bez defer, zeby motyw byl ustawiony przed pierwszym malowaniem.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SddUI = factory();
})(this, function () {
  'use strict';

  const KEY = 'sdd-theme';
  // Zapisany wybor ('light' / 'dark') albo motyw systemu. Nie ma "auto".
  function pickTheme(stored, systemDark) {
    return stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
  }

  // Przedrostek kontekstu z adresu strony: '' (Twoj modul), '/demo', '/demo/start' (zmiana 0.12.0).
  function base(pathname) {
    const m = /^\/demo(\/start)?(?=\/|$)/.exec(pathname || '');
    return m ? m[0] : '';
  }

  function tabs(page, b) {
    b = b || '';
    // /demo/start nie ma plikow requirements/, wiec nie ma panelu, modulu ani konfiguracji
    if (b === '/demo/start') return [
      { href: b, label: 'Tablica warsztatowa', short: 'Tablica', current: page === 'board' },
      { href: b + '/guide', label: 'Jak to działa', short: 'Jak działa', current: page === 'guide' },
    ];
    // Modul, Jak to dziala (0.16.0, AC-C1); Konfiguracja od 0.34.0 nie jest zakladka - ikona ⚙ w naglowku (cfgHref)
    return [
      { href: b || '/', label: 'Panel modułu', short: 'Panel', current: page === 'panel' },
      { href: b + '/board', label: 'Tablica warsztatowa', short: 'Tablica', current: page === 'board' },
      { href: b + '/module', label: 'Moduł', short: 'Moduł', current: page === 'module' },
      { href: b + '/guide', label: 'Jak to działa', short: 'Jak działa', current: page === 'guide' },
    ];
  }
  // Konfiguracja (0.34.0, AC-F2): link ⚙ w naglowku; /demo/start nie ma konfiguracji
  function cfgHref(b) { b = b || ''; return b === '/demo/start' ? null : b + '/config'; }

  const LEVEL = { full: 'pełny', light: 'lekki' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Menu modulow w naglowku "Wymagania do modulu: X ▾" (panel i tablica).
  // demo (0.11.0): bez "Nowy modul…" i "Zmien katalog…" - demo nie dotyka modulow usera.
  // cur: sciezka modulu (0.13.0) albo nazwa (starsze wywolania); modul spoza katalogu - dopisek i sciezka w podpowiedzi.
  const isCur = function (m, cur) { return !!cur && (m.dir ? m.dir === cur : false) || m.name === cur; };
  function modMenu(mods, cur, demo) {
    const list = (mods || []).slice();
    if (cur && !list.some(function (m) { return isCur(m, cur); })) list.unshift({ name: cur });
    return '<div class="mh">Moduły</div><ul>' + list.map(function (m) {
      const on = isCur(m, cur);
      return '<li><button type="button" role="menuitemradio" aria-checked="' + on + '" data-mod="' + esc(m.name) + '"' +
        (m.dir ? ' data-dir="' + esc(m.dir) + '" title="' + esc(m.dir) + '"' : '') + '><span class="ck">' + (on ? '✓' : '') + '</span>' +
        '<span class="nm">' + esc(m.name) + (m.external ? ' <span class="ext">poza katalogiem</span>' : '') + '</span>' +
        '<span class="lv">' + esc(LEVEL[m.level] || m.level || '') + '</span></button></li>';
    }).join('') + '</ul>' + (demo ? '' : '<div class="sep"></div><button type="button" role="menuitem" class="add" id="newmod"><span class="ck">+</span>Nowy moduł…</button>' +
      '<button type="button" role="menuitem" class="add" id="addproj"><span class="ck">⤓</span>Dodaj istniejący projekt…</button>' +
      '<button type="button" role="menuitem" class="add" id="chroot"><span class="ck">⌂</span>Zmień katalog modułów…</button>');
  }

  // Karta etapu w panelu (zmiana 0.10.0): wybor usera, a bez niego rozwinieta tylko karta aktualnego kroku.
  function cardOpen(key, current, toggled) {
    return toggled && typeof toggled[key] === 'boolean' ? toggled[key] : key === current;
  }

  // Lista pozycji pod licznikiem karty (zmiana 0.15.0, AC-57). detail = {file, items:[{id,title,status,note,warn}]}.
  // Status ze znanym slowem -> znacznik (pelny w dymku), inny (np. "zdecydowal: X · data") -> linia szczegolow.
  // Wyglad 0.34.0 (handoff 2.3, AC-F4): naglowek z plikiem i ×, pozycja = ID · tresc · znacznik, pod spodem "do" / "skad".
  const STATUS_WORD = /^(zatwierdzone|robocze|potwierdzone|niepotwierdzone|obalone|do przegladu|zakwestionowane|odpowiedziane|otwarte|zadane|sprzeczne|zaparkowane)/i;
  function tagClass(word) {
    return /obalone|zakwestionowane|sprzeczne|blokuje/i.test(word) ? ' bad' : /^(zatwierdzone|potwierdzone|odpowiedziane)/i.test(word) ? ' ok'
      : /^(otwarte|zadane)/i.test(word) ? ' work' : '';
  }
  // "do: rola · skąd: plik" -> etykieta (faint) + wartosc; zrodlo mono z lamaniem dlugich sciezek
  function metaHtml(meta) {
    return meta.split(' · ').filter(Boolean).map(function (part) {
      const m = /^(do|skąd|zamknięte): (.*)$/.exec(part);
      if (!m) return '<span>' + esc(part) + '</span>';
      return '<span><span class="ml">' + m[1] + '</span> ' + (m[1] === 'skąd' ? '<span class="src">' + esc(m[2]) + '</span>' : esc(m[2])) + '</span>';
    }).join('');
  }
  function countList(label, d, closable) {
    const items = (d && d.items) || [];
    let out = '<div class="files qs cl"><div class="clh"><b>' + items.length + '</b> ' + esc(label) +
      (d && d.file ? ' <span class="clf"><code>' + esc(d.file) + '</code></span>' : '') +
      (closable ? '<button type="button" class="clx" aria-label="Zamknij listę" title="Zamknij listę">×</button>' : '') + '</div>';
    if (!items.length) return out + '<p class="nofiles">Brak pozycji.</p></div>';
    return out + '<ul>' + items.map(function (it) {
      const st = String(it.status || ''), m = st.match(STATUS_WORD);
      const tag = m ? '<span class="tag' + tagClass(m[1]) + '" title="' + esc(st) + '">' + esc(m[1].toLowerCase()) + '</span>' : '<span></span>';
      const meta = [m ? '' : st, it.note].filter(Boolean).join(' · ');
      return '<li><span class="qid">' + esc(it.id || '') + '</span><span class="qt">' + esc(it.title) +
        (it.warn ? ' <span class="tag bad warn">' + esc(it.warn) + '</span>' : '') + '</span>' + tag +
        (meta ? '<span class="qm">' + metaHtml(meta) + '</span>' : '') + '</li>';
    }).join('') + '</ul></div>';
  }

  // Rozwiniecia skrotow (AC-C17) - jeden slownik dla wszystkich zakladek.
  const ABBR = { R: 'wymagania', D: 'decyzje', GLOSSARY: 'słownik pojęć', BR: 'reguły biznesowe', PRD: 'cały dokument wymagań',
    Q: 'pytania', A: 'założenia', AC: 'kryteria akceptacji' };
  // Zrodla w nawiasach ([Biz], [App], [Dok], [AI]) i **tekst** pogrubione; wejscie juz escapowane (0.22.0, AC-C23).
  const MARKS = /\[(Biz|App|Dok|AI)\]/g;
  function marks(html) { return String(html).replace(MARKS, '<strong>[$1]</strong>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
  // Tytul karty przegladarki (AC-U19, user): "SDD: <modul>" na kazdej stronie; demo "SDD: Demo"; bez modulu "SDD".
  function tabTitle(mod, page, demo) {
    if (demo) return 'SDD: Demo';
    return mod ? 'SDD: ' + mod : 'SDD';
  }

  // Kotwica z tytulu karty (AC-C25): male litery, bez polskich znakow, '-' zamiast reszty.
  function slug(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[łŁ]/g, 'l').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function abbr(code) { return ABBR[code] ? code + ' – ' + ABBR[code] : String(code); }

  // Wersja w pasku (AC-U10): stary serwer po aktualizacji pluginu -> ostrzezenie o restarcie.
  // AC-U15 (0.21.0): plugin w Claude Code w innej wersji niz kit na dysku -> ostrzezenie o aktualizacji pluginu.
  // AC-U16 (0.25.0): wersja jest linkiem do Release Notes tej wersji na GitHubie.
  const RELEASES = 'https://github.com/SyBeer/sdd-kit/releases/tag/v';
  // AC-U20 (0.41.0): przy ostrzezeniu klik prowadzi do krokow w Konfiguracji (karta Serwer, #wersja), nie na GitHub.
  function versionBadge(v, b) {
    if (!v || !v.running) return null;
    const server = !!v.disk && v.disk !== v.running;
    const plugin = !!v.plugin && !!v.disk && v.plugin !== v.disk;
    // AC-U22: `command` omija alias/funkcje "claude" w bash/zsh; PowerShell i cmd go nie znaja
    const cc = v.platform === 'win32' ? 'claude' : 'command claude';
    const tips = [];
    if (server) tips.push('Serwer działa na wersji ' + v.running + ', a zainstalowana jest ' + v.disk +
      '. Zrestartuj serwer: zatrzymaj sdd-board (Ctrl+C) i uruchom ponownie (albo restart w HQAI).');
    if (plugin) tips.push('Plugin w Claude Code ma wersję ' + v.plugin + ', a kit na dysku ' + v.disk +
      '. Zaktualizuj: ' + cc + ' plugin marketplace update sdd-kit && ' + cc + ' plugin update sdd@sdd-kit,' +
      ' potem restart sesji Claude Code.');
    // Sesje Claude Code (0.32.0, AC-SV6): znaczniki z hooka pluginu - wersja skilli, ktora sesja zaladowala
    const sessions = Array.isArray(v.sessions) ? v.sessions : [];
    const old = sessions.filter(s => s.stale);
    if (old.length) tips.push('Sesje Claude Code na starszej wersji skilli:\n' +
      old.map(s => '  ' + (s.cwd || '?') + ' - ' + s.version).join('\n') +
      '\nZamknij te sesje i otwórz nową - skille ładują się przy starcie sesji.');
    else if (sessions.length) tips.push(sessions.length + ' otwart' + (sessions.length === 1 ? 'a sesja' : 'e sesje') +
      ' Claude Code na wersji ' + sessions[0].version + '.');
    const steps = [];
    if (plugin) steps.push(
      { text: 'Odśwież listę wersji pluginu (w terminalu):', cmd: cc + ' plugin marketplace update sdd-kit' },
      { text: 'Zaktualizuj plugin z ' + v.plugin + ' do ' + v.disk + ':', cmd: cc + ' plugin update sdd@sdd-kit' },
      { text: 'Zrestartuj sesję Claude Code - zamknij ją i otwórz nową; skille ładują się przy starcie sesji.' });
    if (server) steps.push({ text: 'Zrestartuj serwer sdd-board (' + v.running + ' → ' + v.disk +
      '): zatrzymaj go (Ctrl+C) i uruchom ponownie, albo restart w HQAI. Potem odśwież tę stronę.' });
    if (old.length && !plugin) steps.push({ text: 'Zamknij sesje Claude Code na starszej wersji skilli i otwórz nową: ' +
      old.map(s => (s.cwd || '?') + ' (' + s.version + ')').join(', ') + '.' });
    const stale = server || plugin || old.length > 0;
    const cfg = stale ? cfgHref(b || '') : null;
    return { stale,
      text: 'v' + v.running + (server ? ' · serwer nieaktualny' : '') + (plugin ? ' · plugin nieaktualny' : '') +
        (old.length ? ' · sesja Claude nieaktualna' : ''),
      title: (tips.length ? tips.join('\n') : 'sdd-kit ' + v.running) +
        (cfg ? '\nKliknij: co zrobić krok po kroku' : '\nKliknij: opis zmian tej wersji na GitHubie'),
      href: cfg ? cfg + '#wersja' : RELEASES + v.running, local: !!cfg, steps: cfg ? steps : [] };
  }

  // Szerokosc okna Claude (AC-T8): zapisana albo 520 px, w zakresie 320 px .. 70% okna.
  function dockWidth(stored, viewport) {
    const n = parseInt(stored, 10), max = Math.floor(viewport * 0.7);
    return Math.max(320, Math.min(n > 0 ? n : 520, max));
  }

  // Opcje xterm.js (AC-W11). Windows: ConPTY sam przerysowuje zawiniete linie - xterm musi o tym wiedziec
  // (windowsPty), inaczej zmiana szerokosci okna psuje ekran Claude.
  function termOptions(state) {
    const o = { fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace', fontSize: 13, cursorBlink: true, scrollback: 5000 };
    if (state && state.platform === 'win32') o.windowsPty = { backend: 'conpty', buildNumber: state.windowsBuild || undefined };
    return o;
  }
  // Klawisze kopiowania / wklejania poza macOS (AC-W11): Ctrl+C z zaznaczeniem kopiuje (bez zaznaczenia to przerwanie
  // dla Claude), Ctrl+V wkleja przez przegladarke. Na macOS robia to Cmd+C / Cmd+V same.
  function termKey(e, hasSelection, isMac) {
    if (isMac || !e || e.type !== 'keydown' || !e.ctrlKey || e.altKey || e.metaKey) return null;
    const k = String(e.key || '').toLowerCase();
    if (k === 'c' && hasSelection) return 'copy';
    if (k === 'v') return 'paste';
    return null;
  }

  // Naglowek wszystkich stron (0.34.0, design_handoff_sdd_kit_ui 1.2, AC-F1): logo, sdd-kit / modul (gniazdo .slot-mod),
  // krotkie zakladki, po prawej: [pytania tablicy] · motyw ☾/☀ · ⚙ Konfiguracja · Claude. Wersja - w pasku stanu (verSlot).
  // Gniazda wypelnia render() elementami ze strony (data-slot) - te same wezly, wiec skrypty stron dzialaja bez zmian.
  const SHORT = { 'Panel modułu': 'Panel', 'Tablica warsztatowa': 'Tablica' };
  function themeNext(t) { return t === 'dark' ? ['light', 'Jasny motyw', '☀'] : ['dark', 'Ciemny motyw', '☾']; }
  function topbarHtml(page, b, t) {
    b = b || '';
    const list = tabs(page, b), next = themeNext(t), cfg = cfgHref(b);
    const claude = b ? '' : '<button type="button" class="cl-btn" aria-pressed="false" title="Claude Code w oknie z prawej, w folderze modułu">Claude</button>';
    // demo: powrot do Twojego modulu (0.12.0); przyklad gotowego modulu jest w Konfiguracji i w Jak to dziala
    const back = b ? '<a class="xlink" href="/">← Twój moduł</a>' : '';
    return '<span class="logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
      '<span class="crumb"><span class="kit">sdd-kit</span><span class="sl">/</span><span class="slot-mod"></span></span>' +
      '<div class="tabs">' + list.map(function (x) {
        const l = SHORT[x.label] || x.label;
        return x.current ? '<span class="tab" aria-current="page">' + l + '</span>' : '<a class="tab" href="' + x.href + '">' + l + '</a>';
      }).join('') + '</div>' +
      '<div class="right">' + (page === 'board' ? '<span class="slot-q"></span><span class="vsep" aria-hidden="true"></span>' : '') +
      back +
      '<button type="button" class="ic theme-btn" data-next="' + next[0] + '" title="' + next[1] + '" aria-label="' + next[1] + '">' + next[2] + '</button>' +
      (b ? '' : '<button type="button" class="ic save" title="Zapisz wersję" aria-label="Zapisz wersję" aria-expanded="false" aria-haspopup="dialog">' + SAVE_SVG + '</button>') +
      (cfg ? '<a class="ic cfg" href="' + cfg + '" title="Konfiguracja" aria-label="Konfiguracja"' + (page === 'config' ? ' aria-current="page"' : '') + '>⚙︎</a>' : '') +
      claude + '</div>';
  }

  // ---------------------------------------------------------------- Zapisz wersje przy zebatce (0.42.0, docs/specs/quick-save.md)
  const SAVE_SVG = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M2.5 2.5h9l2 2v9h-11z"/><path d="M5 2.5v3.5h5V2.5"/><rect x="4.5" y="9" width="7" height="4.5"/></svg>';
  function savePopHtml(b) {
    return '<div class="qs-pop" role="dialog" aria-label="Zapisz wersję"><div class="mh">Zapisz wersję</div>' +
      '<p class="qs-hint">Ważny moment z nazwą, np. pokazane biznesowi – wspólny dla zespołu.</p>' +
      '<div class="qs-row"><input type="text" class="fld" id="qs-name" placeholder="nazwa wersji" autocomplete="off">' +
      '<button type="button" class="btn p" id="qs-save">Zapisz wersję</button></div>' +
      '<p class="qs-msg" id="qs-msg" aria-live="polite"></p>' +
      '<a href="' + esc((b || '') + '/config#kopia') + '" class="qs-all">Zobacz poprzednie wersje</a></div>';
  }
  // res = { name, version } po udanym POST /api/copy/version; err = blad z serwera
  function saveResult(res, err) {
    if (err && err.name === 'AbortError') return { ok: false, html: 'Serwer nie odpowiada. Zamknij albo odśwież inne karty panelu sdd-kit i spróbuj ponownie.' };
    if (err) return { ok: false, html: esc(err.message || err) };
    const v = res && res.version || {};
    return { ok: true, html: 'Zapisano: ' + esc(res && res.name) + (v.sent ? ' · na serwerze' : '') };
  }
  function savePop(btn, b) {
    if (!btn || typeof document === 'undefined') return;
    let pop = null;
    function close() { if (pop) { pop.remove(); pop = null; } btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside, true); }
    function outside(e) { if (pop && !pop.contains(e.target) && !btn.contains(e.target)) close(); }
    function send() {
      const i = pop.querySelector('#qs-name'), go = pop.querySelector('#qs-save'), msg = pop.querySelector('#qs-msg'), n = i.value.trim();
      if (!n) { i.focus(); return; }
      go.disabled = true; go.textContent = 'Zapisuję…'; msg.className = 'qs-msg'; msg.textContent = '';
      // AC-QS5: prosba moze czekac w kolejce przegladarki (limit 6 polaczen) - po 15 s przerwij i powiedz dlaczego
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const tm = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
      fetch(b + '/api/copy/version', { method: 'POST', headers: { 'X-SDD': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }), signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (x) { if (!r.ok) throw new Error(x.error || ('HTTP ' + r.status)); return x; }); })
        .then(function (x) { return saveResult({ name: n, version: x.version }, null); }, function (e) { return saveResult(null, e); })
        .then(function (x) { clearTimeout(tm); if (!pop) return; go.disabled = false; go.textContent = 'Zapisz wersję'; msg.innerHTML = x.html; msg.classList.add(x.ok ? 'ok' : 'err'); if (x.ok) i.value = ''; i.focus(); });
    }
    btn.onclick = function () {
      if (pop) { close(); return; }
      btn.parentNode.insertAdjacentHTML('beforeend', savePopHtml(b));
      pop = btn.parentNode.lastElementChild;
      btn.setAttribute('aria-expanded', 'true');
      pop.querySelector('#qs-save').onclick = send;
      pop.onkeydown = function (e) { if (e.key === 'Enter' && e.target.id === 'qs-name') send(); else if (e.key === 'Escape') { close(); btn.focus(); } };
      document.addEventListener('mousedown', outside, true);
      pop.querySelector('#qs-name').focus();
    };
  }

  // Pokaz zmiany / Przywroc przy wersjach (0.42.0, docs/specs/version-restore.md AC-VR5)
  // dwie czesci (AC-VR5, AC-VR8): co nowego w tej wersji (wzgledem poprzedniej) i od tej wersji do dzis
  const VSINCE = { st: { changed: 'zmieniony', added: 'dodany po tej wersji', removed: 'usunięty po tej wersji' }, was: 'było w wersji', now: 'jest teraz' };
  const VNEWS = { st: { changed: 'zmieniony', added: 'dodany w tej wersji', removed: 'usunięty w tej wersji' }, was: 'było wcześniej', now: 'jest w tej wersji' };
  function filesWord(n) {
    const t = n % 10, h = n % 100;
    return n === 1 ? 'plik' : (t >= 2 && t <= 4 && (h < 12 || h > 14)) ? 'pliki' : 'plików';
  }
  function fileList(files, L, truncated) {
    const n = files.length;
    return '<p class="vnote">' + n + ' ' + filesWord(n) + ' · <span class="dl del">-</span> ' + L.was + ' · <span class="dl add">+</span> ' + L.now + '</p>' +
      files.map(function (f) {
        const body = f.binary ? '<p class="vnote">plik binarny – bez podglądu</p>' :
          '<pre class="dp">' + String(f.patch || '').split('\n').map(function (l) {
            const c = l[0] === '+' ? ' add' : l[0] === '-' ? ' del' : l.slice(0, 2) === '@@' ? ' hunk' : '';
            return '<span class="dl' + c + '">' + (c === ' hunk' ? '⋯' : esc(l)) + '</span>';
          }).join('\n') + '</pre>';
        return '<details class="vf"><summary><span class="vst ' + esc(f.status) + '">' + (L.st[f.status] || esc(f.status)) + '</span> ' +
          '<span class="path">' + esc(f.file) + '</span>' + (f.binary ? '' : ' <span class="khint">+' + (f.adds | 0) + ' −' + (f.dels | 0) + '</span>') +
          '</summary>' + body + '</details>';
      }).join('') + (truncated ? '<p class="vnote">Pokazano część zmian – pliki są duże.</p>' : '');
  }
  // "Co się zmieniło w wymaganiach" (0.42.0, docs/specs/version-summary.md AC-VS5): zdania z porownania po kluczach
  const SGROUP = { board: 'Tablica', QUESTIONS: 'Pytania', DECISIONS: 'Decyzje', ASSUMPTIONS: 'Założenia', GLOSSARY: 'Słownik',
    RULES: 'Reguły biznesowe', ENTITIES: 'Encje', SYSTEMS: 'Systemy', ACTORS: 'Aktorzy', PRD: 'Wymagania (PRD)', other: 'Inne pliki' };
  const NTYPE = { ev: 'zdarzenie', cmd: 'komenda', act: 'kto', pol: 'reguła', rm: 'widok', hot: 'nie wiemy', space: 'odstęp' };
  const NFIELD = { source: 'źródło', ref: 'odwołanie', file: 'plik' };
  // rzeczownik i rodzaj (n/f/m) z prefiksu ID, bez ID - z pliku
  const NOUN = { Q: ['pytanie', 'n'], D: ['decyzja', 'f'], A: ['założenie', 'n'], R: ['wymaganie', 'n'], BR: ['reguła', 'f'], S: ['system', 'm'],
    GLOSSARY: ['pojęcie', 'n'], ACTORS: ['aktor', 'm'], ENTITIES: ['encja', 'f'] };
  const ADJ = { added: { n: 'Nowe', f: 'Nowa', m: 'Nowy' }, removed: { n: 'Usunięte', f: 'Usunięta', m: 'Usunięty' }, changed: { n: 'Zmienione', f: 'Zmieniona', m: 'Zmieniony' } };
  const cut = v => { v = String(v == null ? '' : v); return v.length > 60 ? v.slice(0, 60).replace(/\s+\S*$/, '') + '…' : v; };
  const q = v => '„' + esc(cut(v)) + '”';
  const nt = t => NTYPE[t] ? ' (' + NTYPE[t] + ')' : '';
  function sentence(it, group) {
    if (it.type === 'note') {
      if (it.change === 'added') return 'Dodano karteczkę ' + q(it.text) + nt(it.noteType) + ' w procesie ' + q(it.lane);
      if (it.change === 'removed') return 'Usunięto karteczkę ' + q(it.text) + nt(it.noteType) + ' z procesu ' + q(it.lane);
      if (it.change === 'moved') return 'Przeniesiono karteczkę ' + q(it.text) + nt(it.noteType) + ': ' + q(it.from) + ' → ' + q(it.to);
      if (it.change === 'text') return 'Zmieniono treść karteczki' + nt(it.noteType) + ': ' + q(it.from) + ' → ' + q(it.to);
      if (it.change === 'type') return 'Zmieniono typ karteczki ' + q(it.text) + ': ' + esc(NTYPE[it.from] || it.from) + ' → ' + esc(NTYPE[it.to] || it.to);
      return 'Zmieniono karteczkę ' + q(it.text) + ': ' + (it.fields || []).map(function (f) { return esc(NFIELD[f] || f); }).join(', ');
    }
    if (it.type === 'lane') return (it.change === 'added' ? 'Nowy proces ' : 'Usunięty proces ') + q(it.name);
    if (it.type === 'title') return 'Zmieniono ' + (it.change === 'title' ? 'tytuł' : 'podtytuł') + ' tablicy: ' + q(it.from) + ' → ' + q(it.to);
    if (it.type === 'file') return ({ added: 'Nowy plik ', removed: 'Usunięty plik ' }[it.change] || 'Zmieniony plik ') + esc(it.file || '');
    const m = String(it.key).match(/^([A-Z]{1,3})-\d/), noun = NOUN[m ? m[1] : group] || ['sekcja', 'f'];
    let z = ADJ[it.change][noun[1]] + ' ' + noun[0] + ' ' + (m ? esc(it.key) + (it.title ? ' – ' + q(it.title) : '') : q(it.key));
    if (it.change === 'changed') z += ': ' + (it.fields || []).map(function (f) {
      return esc(f.name) + ('from' in f ? ' (' + esc(cut(f.from)) + ' → ' + esc(cut(f.to)) + ')' : '');
    }).join(', ');
    return z;
  }
  function summaryHtml(summary) {
    const groups = (summary || []).filter(function (g) { return g.items && g.items.length; });
    if (!groups.length) return '<p class="vnote">Tylko zmiany techniczne (kolejność, daty) – treść wymagań bez zmian.</p>';
    return groups.map(function (g) {
      const list = g.items.map(function (it) { return sentence(Object.assign({ file: g.file }, it), g.group); });
      const more = list.length > 12 ? '<li class="vmore">i jeszcze ' + (list.length - 12) + '…</li>' : '';
      return '<div class="vsg"><b>' + esc(SGROUP[g.group] || g.group) + '</b><ul>' + list.slice(0, 12).map(function (z) { return '<li>' + z + '</li>'; }).join('') + more + '</ul></div>';
    }).join('');
  }
  // jedna czesc: zdania, pod nimi zwiniete szczegoly (linie)
  function partHtml(files, L, truncated, summary) {
    return '<p class="vsub">Co się zmieniło w wymaganiach</p>' + summaryHtml(summary) +
      '<details class="vdet"><summary>Szczegóły – linie w plikach</summary>' + fileList(files, L, truncated) + '</details>';
  }
  function diffHtml(res) {
    res = res || {};
    const news = res.news || { base: { kind: 'none', name: '' }, files: [], truncated: false }, base = news.base || {};
    const vs = base.kind === 'version' ? 'w porównaniu z wersją „' + esc(base.name) + '”' : base.kind === 'copy' ? 'z poprzednią kopią' : 'pierwsza kopia – wszystko nowe';
    const since = res.files || [];
    return '<h4 class="vh">Co nowego w tej wersji <span class="khint">' + vs + '</span></h4>' +
      (news.files && news.files.length ? partHtml(news.files, VNEWS, news.truncated, news.summary) : '<p class="vnote">Ta wersja niczego nie zmieniła.</p>') +
      '<h4 class="vh">Od tej wersji do dziś</h4>' +
      (since.length ? partHtml(since, VSINCE, res.truncated, res.summary) : '<p class="vnote">Od tej wersji nic się nie zmieniło.</p>');
  }
  function restoreAsk(v) {
    return '<div class="vask"><p>Przywrócić wersję „<b>' + esc(v.name) + '</b>”' + (v.at ? ' z ' + esc(copyTime(v.at)) : '') + '? ' +
      'Pliki w requirements/ wrócą do stanu z tej wersji, a pliki dodane później znikną. ' +
      'Najpierw zapiszę obecny stan jako wersję „przed przywróceniem …” – wrócisz do niego tym samym przyciskiem.</p>' +
      '<div class="rowc"><button type="button" class="btn p" data-vrestore-go="' + esc(v.tag) + '">Przywróć</button>' +
      '<button type="button" class="btn" data-vrestore-no>Anuluj</button></div></div>';
  }

  // Polaczenie na zywo (0.42.0, AC-LC1): w schowanej karcie zamkniete - przegladarka ma tylko 6 polaczen na serwer,
  // a serwer po polaczeniu i tak wysyla pelny stan. env (testy): { EventSource, document }.
  function liveSource(url, h, env) {
    env = env || {};
    const ES = env.EventSource || (typeof EventSource !== 'undefined' ? EventSource : null);
    const doc = env.document || (typeof document !== 'undefined' ? document : null);
    h = h || {};
    let es = null;
    function open() {
      if (es || !ES) return;
      es = new ES(url);
      es.onopen = function (e) { if (h.open) h.open(e); };
      es.onmessage = function (e) { if (h.message) h.message(e); };
      es.onerror = function (e) {
        if (h.error) h.error(e);
        // retry (tablica): wlasne ponowienie zamiast wbudowanego w EventSource
        if (h.retry) { shut(); wait(function () { if (!(doc && doc.hidden)) open(); }, h.retry); }
      };
    }
    const wait = env.setTimeout || function (fn, ms) { setTimeout(fn, ms); };
    function shut() { if (es) { es.close(); es = null; } }
    if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', function () { if (doc.hidden) shut(); else open(); });
    if (!(doc && doc.hidden)) open();
    return { close: shut };
  }

  // ---------------------------------------------------------------- czat (0.38.0, docs/specs/claude-chat.md)
  // Prosty markdown odpowiedzi Claude: akapity, listy, **pogrubienie**, *kursywa*, `kod`; HTML zawsze escapowany.
  function chatInline(t) {
    return esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }
  // Tabela markdown (0.40.1, AC-CH16): wiersze "| a | b |", opcjonalna linia "|---|---|" po naglowku
  const TROW = /^\s*\|.*\|\s*$/, TSEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  function chatCells(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return chatInline(c.trim()); }); }
  function chatTable(rows) {
    let head = null;
    if (rows.length > 1 && TSEP.test(rows[1])) { head = chatCells(rows[0]); rows = rows.slice(2); }
    const tr = function (cells, tag) { return '<tr>' + cells.map(function (c) { return '<' + tag + '>' + c + '</' + tag + '>'; }).join('') + '</tr>'; };
    return '<div class="tbl"><table>' + (head ? '<thead>' + tr(head, 'th') + '</thead>' : '') +
      '<tbody>' + rows.filter(function (r) { return !TSEP.test(r); }).map(function (r) { return tr(chatCells(r), 'td'); }).join('') + '</tbody></table></div>';
  }
  function chatMd(text) {
    const out = []; let list = null, para = [], table = [];
    const flush = function () { if (para.length) { out.push('<p>' + para.map(chatInline).join('<br>') + '</p>'); para = []; } };
    const close = function () { if (list) { out.push('</' + list + '>'); list = null; } };
    const closeT = function () { if (table.length) { out.push(chatTable(table)); table = []; } };
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (l) {
      if (TROW.test(l) || (table.length && TSEP.test(l))) { flush(); close(); table.push(l); return; }
      closeT();
      const m = l.match(/^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/);
      if (m) { flush(); const t = m[2] ? 'ol' : 'ul'; if (list !== t) { close(); out.push('<' + t + '>'); list = t; } out.push('<li>' + chatInline(m[3]) + '</li>'); return; }
      if (!l.trim()) { flush(); close(); return; }
      close(); para.push(l.trim());
    });
    flush(); close(); closeT();
    return out.join('');
  }
  // Propozycja odpowiedzi (0.40.1, AC-CH17): znacznik "[[odpowiedz: …]]" z instrukcji czatu, zapasowo "Odpisz „…”"
  function replyHint(text) {
    let t = String(text || ''), hint = '';
    const re = /\[\[\s*odpowied[zź]\s*:\s*([^\]]{1,200}?)\s*\]\]/gi;
    let m;
    while ((m = re.exec(t))) hint = m[1].trim();
    t = t.replace(re, '').replace(/\s+$/, '');
    if (!hint) { const o = /(?:Odpisz|Napisz|Odpowiedz)\s+[„"»]([^”"«\n]{1,60})[”"«]/i.exec(t); if (o) hint = o[1].trim(); }
    return { text: t, hint: hint };
  }
  // Dzialania Claude w jednej linijce: "zapisano A.md, B.md · odczyt 2 plików · skill interview"
  const WRITES = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'], READS = ['Read', 'Glob', 'Grep'];
  function toolSummary(list) {
    const w = [], other = [];
    let r = 0, sh = 0;
    (list || []).forEach(function (t) {
      if (WRITES.indexOf(t.name) >= 0) { if (t.target && w.indexOf(t.target) < 0) w.push(t.target); }
      else if (READS.indexOf(t.name) >= 0) r++;
      else if (t.name === 'Bash') sh++;  // tresc polecenia tylko w podpowiedzi (0.38.1, AC-CH9)
      else other.push((t.name === 'Skill' ? 'skill ' : t.name + ' ') + (t.target || '').slice(0, 60));
    });
    const parts = [];
    if (w.length) parts.push('zapisano ' + w.join(', '));
    if (r) parts.push('odczyt ' + r + ' ' + (r === 1 ? 'pliku' : 'plików'));
    if (sh) parts.push(sh + ' ' + (sh === 1 ? 'polecenie' : sh < 5 ? 'polecenia' : 'poleceń'));
    return parts.concat(other).join(' · ');
  }

  // Czas rozmowy (0.39.0, AC-CH10): Claude pyta, ile jest czasu - panel daje gotowe odpowiedzi i odlicza czas.
  function asksTime(text) { return /ile\s+(masz|mamy|macie)\b[^?]{0,40}czasu/i.test(String(text || '')); }
  function parseMinutes(text) {
    const t = String(text || '').toLowerCase();
    if (/półtorej\s+godz|1[.,]5\s*(h|godz)/.test(t)) return 90;
    if (/pół\s+godz/.test(t)) return 30;
    let m = t.match(/(\d+)\s*(h|godz)/); if (m) return +m[1] * 60;
    m = t.match(/(\d+)\s*(min|m\b)/); if (m) return +m[1];
    if (/(^|\s)godzin(ę|a|e)(?![a-ząćęłńóśźż])/.test(t)) return 60;
    m = t.match(/^\s*(\d{1,3})\s*\.?\s*$/); if (m) return +m[1];
    return null;
  }
  // Koniec czasu (0.39.2, AC-CH15): Claude pyta, czy kontynuowac - panel daje "Kontynuujmy (+N min)" / "Kończymy na dziś"
  function asksContinue(text) { return /kontynuujemy czy kończymy|czy (chcesz )?kontynuować|czy ciągniemy dalej/i.test(String(text || '')); }
  function clockText(ms) { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function clockState(ms) { return ms <= 0 ? 'over' : ms <= 5 * 60e3 ? 'low' : ''; }

  // ---------------------------------------------------------------- kopia w repozytorium (0.41.0, docs/specs/repo-copy.md AC-RC12)
  // Dopisek w pasku stanu za "na zywo: polaczono": zielona kropka = kopia na serwerze, szara = tylko na tym komputerze,
  // zolta = brak kopii / niewyslana (przyczyna w podpowiedzi). Szara i zolta prowadza do Konfiguracji.
  const COPY_TIP = { nogit: 'Moduł nie jest repozytorium git – praca jest tylko na tym komputerze, bez kopii.',
    local: 'Kopia jest tylko na tym komputerze – chroni przed złą zmianą, nie przed utratą dysku. Wysyłkę na serwer włączysz w Konfiguracji.',
    noorigin: 'Brak adresu serwera (origin) – kopia nie ma dokąd pojechać.' };
  function copyTime(iso, now) {
    const d = new Date(iso), n = now || new Date(), z = v => (v < 10 ? '0' : '') + v;
    if (isNaN(d)) return '';
    const hm = z(d.getHours()) + ':' + z(d.getMinutes());
    return d.toDateString() === n.toDateString() ? hm : z(d.getDate()) + '.' + z(d.getMonth() + 1) + ' ' + hm;
  }
  function copyLive(copy, b, now) {
    if (!copy || !copy.state) return null;
    const t = copy.at ? copyTime(copy.at, now) : '';
    if (copy.state === 'ok') return { cls: 'ok', html: '<span id="copy" title="Kopia wymagań jest na serwerze (' + esc(copy.origin || '') + ')">· kopia ' + esc(t) + '</span>' };
    const link = (txt, tip) => '<span id="copy">· <a href="' + esc((b || '') + '/config#kopia') + '" title="' + esc(tip) + '">' + esc(txt) + '</a></span>';
    if (copy.state === 'local') return { cls: 'idle', html: link('kopia tylko na tym komputerze' + (t ? ' ' + t : ''), COPY_TIP.local) };
    if (copy.state === 'nogit') return { cls: 'warn', html: link('brak kopii', COPY_TIP.nogit) };
    const tip = copy.state === 'noorigin' ? COPY_TIP.noorigin : 'Kopia nie dotarła na serwer' + (copy.error ? ': ' + copy.error : '.') + (t ? ' Ostatnia kopia lokalna ' + t + '.' : '');
    return { cls: 'warn', html: link('kopia niewysłana', tip) };
  }
  function showCopy(copy) {
    if (typeof document === 'undefined') return;
    const live = document.getElementById('live');
    if (!live) return;
    const old = document.getElementById('copy');
    if (old) old.remove();
    live.classList.remove('warn', 'idle');
    const x = copyLive(copy, base(location.pathname));
    if (!x) return;
    if (x.cls !== 'ok') live.classList.add(x.cls);
    const conn = document.getElementById('conn');
    (conn ? conn.parentNode : live).insertAdjacentHTML('beforeend', ' ' + x.html);
  }

  const api = { topbarHtml, pickTheme, base, tabs, cfgHref, modMenu, cardOpen, countList, metaHtml, tagClass, ABBR, abbr, marks, versionBadge, dockWidth, termOptions, termKey, slug, tabTitle, KEY, chatMd, replyHint, toolSummary, asksTime, asksContinue, parseMinutes, clockText, clockState, copyLive, showCopy, savePopHtml, saveResult, liveSource, diffHtml, restoreAsk, summaryHtml };
  if (typeof document === 'undefined') return api;

  // ---------------------------------------------------------------- przegladarka
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function load() { return pickTheme(stored(), !!(mq && mq.matches)); }
  function save(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }
  // Bez zapisanego wyboru: bez atrybutu - kolory z prefers-color-scheme (dziala tez bez JS).
  function apply() {
    const s = stored(), el = document.documentElement;
    if (s === 'light' || s === 'dark') el.setAttribute('data-theme', s); else el.removeAttribute('data-theme');
  }
  apply();

  // Motyw: jeden przycisk ☾/☀ (0.33.0 tablica, od 0.34.0 wszystkie strony)
  function mark(bar, t) {
    const tb = bar.querySelector('.theme-btn');
    if (tb) { const n = themeNext(t); tb.setAttribute('data-next', n[0]); tb.title = n[1]; tb.setAttribute('aria-label', n[1]); tb.textContent = n[2]; }
  }

  // Miejsce na wersje: pierwszy element paska stanu strony (.statusbar)
  function verSlot() {
    const sb = document.querySelector('.statusbar');
    if (!sb) return null;
    let el = sb.querySelector('.ver');
    if (!el) { el = document.createElement('a'); el.className = 'ver'; el.target = '_blank'; el.rel = 'noopener'; el.hidden = true; sb.insertBefore(el, sb.firstChild); }
    return el;
  }
  function render(bar) {
    const page = bar.getAttribute('data-page');
    const t = load();
    const b = base(location.pathname);
    // Gniazda (0.33.0 tablica, 0.34.0 wszystkie strony): przelacznik modulu i pytania stoja w HTML strony, tu trafiaja na miejsce
    const slots = [].slice.call(bar.querySelectorAll('[data-slot]'));
    bar.innerHTML = topbarHtml(page, b, t);
    slots.forEach(function (el) { const to = bar.querySelector('.slot-' + el.getAttribute('data-slot')); if (to) to.replaceWith(el); });
    const tb = bar.querySelector('.theme-btn');
    savePop(bar.querySelector('.save'), b);
    if (tb) tb.onclick = function () { save(pickTheme(tb.getAttribute('data-next'), false)); apply(); mark(bar, load()); };
    // zmiana w innej karcie (panel <-> tablica)
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY && e.key !== null) return;
      apply(); mark(bar, load());
    });
    // bez zapisanego wyboru zaznaczenie idzie za systemem
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { mark(bar, load()); });
    // Wersja sdd-kit na lewym brzegu paska stanu (0.34.1, AC-F9); stary serwer / plugin / sesja -> ostrzezenie w tym miejscu
    const el = verSlot();
    fetch(b + '/api/version').then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
      const x = versionBadge(v, b);
      if (!x || !el) return;
      el.textContent = x.text; el.title = x.title; el.href = x.href; el.classList.toggle('stale', x.stale); el.hidden = false;
      el.target = x.local ? '_self' : '_blank';
      const logo = bar.querySelector('.logo');
      if (logo) logo.title = 'sdd-kit ' + x.text;
    }).catch(function () {});
    // okno eksportu PDF tablicy (?pdf=1): bez okna Claude - nie przejmuje rozmiaru terminala (docs/specs/board-pdf.md)
    if (!b && !/[?&]pdf=1(&|$)/.test(location.search)) { claudeDock(bar.querySelector('.cl-btn')); updateChip(bar); }
  }

  // ---------------------------------------------------------------- nowa wersja z GitHuba (0.27.0, docs/specs/update.md)
  // Od 0.35.1 (AC-UP9): zielona strzalka w dol tuz za numerem wersji w pasku stanu; Konfiguracja otwiera to samo okienko.
  let openUpd = null;
  api.openUpdate = function () { if (openUpd) openUpd(true); return !!openUpd; };
  function updateChip(bar) {
    fetch('/api/update').then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
      if (!st || !st.newer) return;
      const ver = verSlot(), wrap = document.createElement('span');
      if (!ver) return;
      wrap.className = 'upd';
      wrap.innerHTML = '<button type="button" class="upd-btn" aria-expanded="false" title="Dostępna nowa wersja ' + st.latest + ' - kliknij, żeby zaktualizować" aria-label="Dostępna nowa wersja ' + st.latest + '">↓</button>' +
        '<div class="upd-pop" role="dialog" aria-label="Nowa wersja sdd-kit" hidden>' +
        '<p><b>Dostępna wersja ' + st.latest + '</b> (masz ' + st.current + ').</p>' +
        '<p><a href="' + (st.url || '#') + '" target="_blank" rel="noopener">Co nowego ↗</a></p>' +
        (st.canUpdate ? '<p class="upd-note">Pobierze nową wersję z GitHuba i zaktualizuje dodatek w Claude Code.</p>'
          : '<p class="upd-note">' + String(st.reason || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</p>') +
        '<p class="upd-msg" hidden></p><pre class="upd-log" hidden></pre>' +
        '<div class="upd-row">' + (st.canUpdate ? '<button type="button" class="upd-go">Aktualizuj</button>' : '') +
        '<button type="button" class="upd-x">Później</button></div></div>';
      ver.parentNode.insertBefore(wrap, ver.nextSibling);
      const btn = wrap.querySelector('.upd-btn'), pop = wrap.querySelector('.upd-pop');
      function open(on) { pop.hidden = !on; btn.setAttribute('aria-expanded', on); if (on) { const g = pop.querySelector('.upd-go') || pop.querySelector('.upd-x'); if (g) g.focus(); } }
      openUpd = open;
      btn.onclick = function () { open(pop.hidden); };
      wrap.querySelector('.upd-x').onclick = function () { open(false); btn.focus(); };
      pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { open(false); btn.focus(); } });
      document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('.upd')) open(false); });
      const go = wrap.querySelector('.upd-go'), msg = wrap.querySelector('.upd-msg'), log = wrap.querySelector('.upd-log');
      if (go) go.onclick = function () {
        go.disabled = true; msg.hidden = false; msg.textContent = 'Aktualizuję… (to może potrwać do minuty)'; log.hidden = true;
        fetch('/api/update', { method: 'POST', headers: { 'X-SDD': '1', 'Content-Type': 'application/json' }, body: '{}' })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
          .then(function (j) {
            if (j.ok) {
              msg.textContent = 'Zaktualizowano do ' + j.disk + '. Zrestartuj serwer sdd-board (Ctrl+C i sdd-board albo restart w HQAI) i sesję Claude Code, potem odśwież stronę.';
              go.remove(); btn.textContent = '✓ ' + j.disk;
            } else {
              msg.textContent = 'Aktualizacja przerwana. Szczegóły poniżej.'; go.disabled = false;
            }
            log.textContent = (j.log || []).map(function (x) { return '$ ' + x.cmd + '\n' + x.output; }).join('\n\n');
            log.hidden = !log.textContent || j.ok;
          })
          .catch(function (e) { msg.textContent = e.message; go.disabled = false; });
      };
    }).catch(function () {});
  }

  // ---------------------------------------------------------------- okno Claude Code (0.25.0, docs/specs/claude-dock.md)
  // Terminal xterm.js z prawej; sesja zyje na serwerze, okno tylko sie podlacza (SSE + POST).
  const DOCK_KEY = 'sdd-claude';
  const XTERM = 'https://cdn.jsdelivr.net/npm/';
  const XTERM_FILES = ['@xterm/xterm@5.5.0/css/xterm.min.css', '@xterm/xterm@5.5.0/lib/xterm.min.js', '@xterm/addon-fit@0.10.0/lib/addon-fit.min.js'];
  let xtermReady = null;
  function loadXterm() {
    if (xtermReady) return xtermReady;
    xtermReady = XTERM_FILES.reduce(function (p, f) {
      return p.then(function () {
        return new Promise(function (ok, fail) {
          const css = /\.css$/.test(f), el = document.createElement(css ? 'link' : 'script');
          if (css) { el.rel = 'stylesheet'; el.href = XTERM + f; } else el.src = XTERM + f;
          el.onload = ok; el.onerror = function () { fail(new Error(f)); };
          document.head.appendChild(el);
        });
      });
    }, Promise.resolve());
    xtermReady.catch(function () { xtermReady = null; });
    return xtermReady;
  }
  function dockPrefs() { try { return JSON.parse(localStorage.getItem(DOCK_KEY)) || {}; } catch (e) { return {}; } }
  function saveDock(p) { try { localStorage.setItem(DOCK_KEY, JSON.stringify(p)); } catch (e) {} }

  const ICON_CHAT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  const ICON_CODE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>';
  function claudeDock(btn) {
    if (!btn) return;
    const root = document.documentElement, prefs = dockPrefs();
    let term = null, fit = null, es = null, state = {}, pending = '', sending = false, rtimer = null;
    const dock = document.createElement('aside');
    dock.className = 'cdock'; dock.setAttribute('aria-label', 'Claude Code');
    dock.innerHTML = '<div class="cd-grip" title="Przeciągnij, żeby zmienić szerokość"></div>' +
      '<div class="cd-head"><b>Claude Code</b><span class="cd-cwd"></span>' +
      // widok okna (0.38.0): czat = styl BIZ, terminal = styl INZ
      '<span class="cd-view" role="group" aria-label="Widok okna Claude">' +
      '<button type="button" data-view="chat" title="Czat – rozmowa w stylu BIZ" aria-label="Czat">' + ICON_CHAT + '</button>' +
      '<button type="button" data-view="code" title="Terminal – styl INŻ" aria-label="Terminal">' + ICON_CODE + '</button></span>' +
      '<span class="cd-style" title="Styl rozmowy wywiadu w tym widoku"></span>' +
      '<button type="button" class="cd-clock" hidden title="Czas na rozmowę - kliknij, żeby zmienić"></button>' +
      '<button type="button" class="cd-run" hidden>Uruchom Claude</button><button type="button" class="cd-new" hidden>Nowa rozmowa</button>' +
      '<button type="button" class="cd-stop" hidden>Zakończ</button>' +
      '<button type="button" class="cd-x" aria-label="Zamknij okno" title="Zamknij okno (Claude działa dalej)">×</button></div>' +
      '<p class="cd-msg" hidden></p><div class="cd-term"></div>' +
      '<div class="cd-chat"><div class="cd-log" aria-live="polite"></div><div class="cd-in">' +
      '<div class="cd-quick" hidden role="group" aria-label="Ile masz czasu"><span>Ile masz czasu?</span>' +
      '<button type="button" data-min="15">15 min</button><button type="button" data-min="30">30 min</button>' +
      '<button type="button" data-min="45">45 min</button><button type="button" data-min="60">1 h</button></div>' +
      '<div class="cd-quick cd-cont" hidden role="group" aria-label="Czy kontynuować"><button type="button" data-cont="1"></button>' +
      '<button type="button" data-cont="0">Kończymy na dziś</button></div>' +
      '<div class="cd-box">' +
      '<textarea class="cd-input" rows="2" placeholder="Napisz wiadomość…" aria-label="Wiadomość do Claude"></textarea>' +
      '<button type="button" class="cd-send" title="Wyślij (Enter)" aria-label="Wyślij">↑</button></div>' +
      '<div class="cd-hint"><span>Enter wysyła · Shift+Enter nowa linia</span><span class="cd-hint2"></span></div></div></div>';
    document.body.appendChild(dock);
    const q = function (s) { return dock.querySelector(s); };
    // Klawisze w terminalu nie uruchamiaja skrotow strony (Escape, Cmd+Z, Cmd+D, Cmd+Enter).
    dock.addEventListener('keydown', function (e) { e.stopPropagation(); });

    function width() { return dockWidth(prefs.w, window.innerWidth); }
    function layout() { root.style.setProperty('--claude-w', width() + 'px'); }
    // Komunikat nad terminalem zmienia jego wysokosc - przelicz wiersze od razu (nie tylko przez ResizeObserver,
    // ktory w ukrytej karcie nie dziala) - AC-T10.
    function msg(t) {
      const m = q('.cd-msg'), was = m.hidden;
      m.textContent = t || ''; m.hidden = !t;
      if (was !== m.hidden) setTimeout(function () { refit(); }, 0);
    }
    function api(url, body) {
      return fetch(url, { method: 'POST', headers: { 'X-SDD': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
    }
    // Sesja na modul (0.34.2, AC-T16): sesje innych modulow dzialaja w tle - powiedz gdzie
    function elsewhere() {
      const o = state.others || [];
      return o.length ? ' Claude działa też w: ' + o.map(function (d) { return d.split(/[\\/]/).filter(Boolean).pop(); }).join(', ') + ' (wróć do modułu, żeby zobaczyć).' : '';
    }
    function show(s) {
      state = s || state;
      const run = !!state.running;
      // Zapisana rozmowa w folderze modulu: "Wznów rozmowę" (claude --continue) i "Nowa rozmowa" (AC-T12)
      const resume = !run && !!state.canResume;
      q('.cd-run').hidden = run || !state.available; q('.cd-stop').hidden = !run;
      q('.cd-new').hidden = !resume || !state.available;
      q('.cd-run').textContent = resume ? 'Wznów rozmowę' : state.exitCode != null && !run ? 'Uruchom ponownie' : 'Uruchom Claude';
      q('.cd-run').title = resume ? 'Ostatnia rozmowa z Claude w tym folderze (claude --continue)' : '';
      const dir = run ? state.cwd : state.module, c = q('.cd-cwd');
      // Windows: sciezka z ukosnikami wstecznymi (C:\\Users\\...\\modul) - nazwa folderu, nie cala sciezka
      c.textContent = dir ? '· ' + dir.split(/[\\/]/).filter(Boolean).pop() + (run && state.module && state.module !== state.cwd ? ' (inny moduł)' : '') : '';
      c.title = dir || '';
      // ConPTY: xterm przerysowuje jak Windows (AC-W11); stan moze przyjsc po utworzeniu terminala
      if (term && state.platform === 'win32') term.options.windowsPty = termOptions(state).windowsPty;
      if (!state.available) msg(state.reason || 'Terminal niedostępny. Uruchom Claude Code w osobnym oknie, w folderze modułu.');
      else if (!run && state.exitCode != null) msg('Sesja zakończona (kod ' + state.exitCode + ').');
      else if (!run && resume) msg('W tym module jest zapisana rozmowa z Claude - możesz ją wznowić albo zacząć nową.' + elsewhere());
      else if (!run) msg('Claude Code uruchomi się w folderze modułu' + (state.module ? ' ' + state.module : '') + '.' + elsewhere());
      else msg('');
    }
    // Serwer bez /api/term = dziala na starym kodzie (pliki przegladarki sa juz nowe) - powiedz to zamiast pustego terminala.
    function refresh() {
      return fetch('/api/term').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(show).catch(function () {
        q('.cd-run').hidden = true; q('.cd-stop').hidden = true;
        msg('Serwer sdd-board nie obsługuje jeszcze okna Claude (działa na starszym kodzie). Zrestartuj serwer: Ctrl+C i sdd-board albo restart w HQAI, potem odśwież stronę.');
      });
    }
    function theme() {
      if (!term) return;
      // tokeny okna (.cdock) - zawsze czarne
      const cs = getComputedStyle(dock), v = function (n) { return cs.getPropertyValue(n).trim(); };
      term.options.theme = { background: v('--panel'), foreground: v('--ink'), cursor: v('--ink'), cursorAccent: v('--panel'), selectionBackground: v('--sel') };
    }
    // force: po podlaczeniu karty (odtworzenie ekranu) - Claude ma sie przerysowac, nawet przy tym samym rozmiarze
    let forceNext = false;
    function sendResize(force) {
      if (force) forceNext = true;
      clearTimeout(rtimer);
      rtimer = setTimeout(function () {
        if (!term || !state.running) return;
        const f = forceNext; forceNext = false;
        api('/api/term/resize', { cols: term.cols, rows: term.rows, force: f }).catch(function () {});
      }, 120);
    }
    function refit() { if (fit && root.classList.contains('claude-on')) { try { fit.fit(); } catch (e) {} sendResize(); } }
    // Jedna sesja, kilka kart (np. Panel i Tablica o roznej wysokosci): rozmiar terminala ustawia karta, w ktorej
    // wlasnie pracujesz - inaczej dol ekranu Claude ucieka poza okno (zmiana 0.28.2, AC-T10).
    let claimed = 0;
    function claim() {
      if (!term || !state.running || !root.classList.contains('claude-on')) return;
      claimed = Date.now(); refit();
    }
    function flush() {
      if (sending || !pending) return;
      const data = pending; pending = ''; sending = true;
      api('/api/term/input', { data: data }).catch(function () {}).then(function () { sending = false; flush(); });
    }
    function connect() {
      if (es) return;
      es = new EventSource('/term-events');
      es.onmessage = function (e) {
        const j = JSON.parse(e.data);
        if (j.replay) { term.reset(); show(j.state); }
        if (j.d) term.write(Uint8Array.from(atob(j.d), function (c) { return c.charCodeAt(0); }));
        if (j.replay && state.running) sendResize(true);
      };
      es.addEventListener('exit', function () { refresh(); });
      es.onopen = function () { refresh(); };
    }
    function setup() {
      return loadXterm().then(function () {
        if (term) return;
        term = new window.Terminal(termOptions(state));
        // Windows / Linux: Ctrl+C z zaznaczeniem kopiuje, Ctrl+V wkleja (xterm domyslnie wysyla ^C / ^V) - AC-W11
        const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
        term.attachCustomKeyEventHandler(function (e) {
          const k = termKey(e, term.hasSelection(), isMac);
          if (k === 'copy') {
            const sel = term.getSelection();
            if (navigator.clipboard) navigator.clipboard.writeText(sel).catch(function () {});
            term.clearSelection(); e.preventDefault();
            return false;
          }
          return k !== 'paste';   // false: xterm nie wysyla ^V, przegladarka robi wklejenie (zdarzenie paste)
        });
        fit = new window.FitAddon.FitAddon();
        term.loadAddon(fit);
        term.open(q('.cd-term'));
        theme();
        term.onData(function (d) {
          if (!state.running) return;
          if (Date.now() - claimed > 2000) claim();  // pisanie w tej karcie = ta karta ustawia rozmiar
          pending += d; flush();
        });
        if (term.textarea) term.textarea.addEventListener('focus', claim);
        // Rozmiar okna Claude zmienia sie tez bez zmiany okna przegladarki (komunikat nad terminalem, uchwyt) - AC-T10
        if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(dock.ro); dock.ro = setTimeout(refit, 60); }).observe(q('.cd-term'));
        // Czcionka dociagnieta po otwarciu zmienia wysokosc wiersza - przelicz wiersze jeszcze raz (AC-T13)
        if (document.fonts) {
          if (document.fonts.ready) document.fonts.ready.then(function () { refit(); });
          if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { refit(); });
        }
        refit(); connect();
      }).catch(function () {
        msg('Nie udało się załadować terminala (xterm.js z cdn.jsdelivr.net). Sprawdź połączenie z internetem i otwórz okno ponownie.');
      });
    }
    function open(on) {
      root.classList.toggle('claude-on', on); btn.setAttribute('aria-pressed', on);
      prefs.open = on; saveDock(prefs);
      if (on && isChat()) { layout(); chatConnect(); }
      else if (on) { layout(); refresh(); setup().then(function () { refit(); if (term) term.focus(); }); }
      else { if (es) { es.close(); es = null; } chatClose(); }
      window.dispatchEvent(new Event('resize'));
    }
    btn.onclick = function () { open(!root.classList.contains('claude-on')); };
    q('.cd-x').onclick = function () { open(false); btn.focus(); };
    function start(resume) {
      setup().then(function () {
        if (!term) return;
        try { fit.fit(); } catch (e) {}
        return api('/api/term/start', { cols: term.cols, rows: term.rows, resume: resume }).then(function (s) { show(s); connect(); term.focus(); });
      }).catch(function (e) { msg(e.message); });
    }
    q('.cd-run').onclick = function () { if (isChat()) chatStart(!!cstate.canResume); else start(!!state.canResume); };
    q('.cd-new').onclick = function () { if (isChat()) chatStart(false); else start(false); };
    q('.cd-stop').onclick = function () {
      if (!confirm('Zakończyć sesję Claude Code? Rozmowa zostanie przerwana (zostaje zapisana - możesz ją wznowić).')) return;
      api(isChat() ? '/api/chat/stop' : '/api/term/stop').catch(function (e) { msg(e.message); });
    };

    // ------------------------------------------------ widok okna: czat / terminal (0.38.0, docs/specs/claude-chat.md)
    let ces = null, cstate = {}, clog = [];
    function isChat() { return prefs.view === 'chat'; }
    function markView() {
      dock.classList.toggle('chatmode', isChat());
      [].forEach.call(dock.querySelectorAll('.cd-view button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === (isChat() ? 'chat' : 'code')); });
      q('.cd-style').textContent = isChat() ? 'BIZ' : 'INŻ';
    }
    q('.cd-view').onclick = function (e) {
      const b = e.target.closest('button[data-view]'); if (!b) return;
      const v = b.getAttribute('data-view'); if ((v === 'chat') === isChat()) return;
      prefs.view = v; saveDock(prefs); markView();
      if (!root.classList.contains('claude-on')) return;
      if (isChat()) { if (es) { es.close(); es = null; } chatConnect(); }
      else { chatClose(); refresh(); setup().then(function () { refit(); if (term) term.focus(); }); }
    };
    function chatClose() { if (ces) { ces.close(); ces = null; } }
    function chatConnect() {
      chatClose();
      fetch('/api/chat').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(chatShow).catch(function () {
        msg('Serwer sdd-board nie obsługuje jeszcze czatu (działa na starszym kodzie). Zrestartuj serwer i odśwież stronę.');
      });
      ces = new EventSource('/chat-events');
      ces.onmessage = function (e) {
        const j = JSON.parse(e.data);
        if (j.replay) clog = j.log || []; else if (j.ev) clog.push(j.ev);
        if (j.state) chatShow(j.state); else chatRender();
      };
    }
    function chatShow(s) {
      cstate = s || cstate;
      const run = !!cstate.running, resume = !run && !!cstate.canResume;
      q('.cd-run').hidden = run; q('.cd-stop').hidden = !run; q('.cd-new').hidden = !resume;
      q('.cd-run').textContent = resume ? 'Wznów rozmowę' : 'Uruchom Claude';
      const dir = cstate.module, c = q('.cd-cwd');
      c.textContent = dir ? '· ' + dir.split(/[\\/]/).filter(Boolean).pop() : ''; c.title = dir || '';
      if (!run && cstate.termRunning) msg('Rozmowa działa teraz w terminalu. „' + q('.cd-run').textContent + '” przeniesie ją tutaj.');
      else if (!run && resume) msg('W tym module jest zapisana rozmowa z Claude - możesz ją wznowić albo zacząć nową.');
      else if (!run) msg('Claude Code uruchomi się w folderze modułu' + (dir ? ' ' + dir : '') + '.');
      else msg('');
      q('.cd-input').disabled = !run;
      chatExtras(cstate);
      chatRender();
    }
    function chatRender() {
      const out = [], log = q('.cd-log');
      let tools = [];
      const flushTools = function () { if (tools.length) { out.push('<div class="tool" title="' + esc(tools.map(function (t) { return t.name + ': ' + t.target; }).join('\n')) + '"><i>✓</i>' + esc(toolSummary(tools)) + '</div>'); tools = []; } };
      clog.forEach(function (e) {
        if (e.kind === 'tool') { tools.push(e); return; }
        if (e.kind === 'init' || e.kind === 'done') return;
        flushTools();
        if (e.kind === 'user') out.push('<div class="m u">' + esc(e.text).replace(/\n/g, '<br>') + '</div>');
        else if (e.kind === 'text') out.push('<div class="m a">' + chatMd(replyHint(e.text).text) + '</div>');
        else if (e.kind === 'denied') out.push('<div class="tool den" title="' + esc(e.text) + '"><i>✕</i>pominięto polecenie spoza czatu – w czacie tylko odczyt i zapis w module; resztę zrób w terminalu (&lt;/&gt;)</div>');
        else if (e.kind === 'start') out.push('<div class="sys">' + (e.resume ? 'rozmowa wznowiona' : 'nowa rozmowa') + ' · styl ' + (e.style === 'inz' ? 'INŻ' : 'BIZ') + '</div>');
        else if (e.kind === 'exit') out.push('<div class="sys">rozmowa zakończona</div>');
        else if (e.kind === 'error') out.push('<div class="tool den"><i>!</i>' + esc(e.text) + '</div>');
      });
      flushTools();
      if (cstate.busy) out.push('<div class="dots" aria-label="Claude pisze"><span></span><span></span><span></span></div>');
      const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      log.innerHTML = out.join('');
      if (atEnd) log.scrollTop = log.scrollHeight;
      quickShow(); clockTick();
    }
    // ---------------- czas rozmowy (0.39.0): koniec zapisany per modul w przegladarce
    const CLOCK_KEY = 'sdd-chat-clock';
    let clockTimer = null, quickOff = false;
    function clockGet() { try { const c = JSON.parse(localStorage.getItem(CLOCK_KEY)) || {}; return c.mod === cstate.module ? c : null; } catch (e) { return null; } }
    function clockSet(min) {
      try { if (min) localStorage.setItem(CLOCK_KEY, JSON.stringify({ mod: cstate.module, end: Date.now() + min * 60e3, min: min })); else localStorage.removeItem(CLOCK_KEY); } catch (e) {}
      clockTick();
    }
    function clockTick() {
      const c = clockGet(), el = q('.cd-clock');
      clearTimeout(clockTimer);
      if (!c || !isChat()) { el.hidden = true; return; }
      const left = c.end - Date.now();
      el.hidden = false; el.className = 'cd-clock ' + clockState(left);
      el.textContent = '⏱ ' + (left > 0 ? clockText(left) : 'czas minął');
      el.title = 'Czas na rozmowę: ' + c.min + ' min - kliknij, żeby zmienić';
      if (left > 0) clockTimer = setTimeout(clockTick, 1000);
    }
    let contFor = null, hintFor = null;
    function quickShow() {
      const last = clog.filter(function (e) { return e.kind === 'text' || e.kind === 'user'; }).pop();
      const lastText = cstate.running && last && last.kind === 'text' ? last.text : '';
      q('.cd-quick:not(.cd-cont)').hidden = !(lastText && asksTime(lastText) && !quickOff);
      const cont = q('.cd-cont'), show = !!lastText && asksContinue(lastText) && contFor !== last;
      cont.hidden = !show;
      if (show) { const m = parseMinutes(lastText) || 10; const b = cont.querySelector('[data-cont="1"]'); b.textContent = 'Kontynuujmy (+' + m + ' min)'; b.setAttribute('data-min', m); cont.last = last; }
      // propozycja odpowiedzi w polu (AC-CH17): raz na wiadomosc, tylko w puste pole i nie obok przyciskow
      const t = q('.cd-input'), hint = lastText ? replyHint(lastText).hint : '';
      if (hint && hintFor !== last && !t.value.trim() && q('.cd-quick:not(.cd-cont)').hidden && cont.hidden) {
        hintFor = last; t.value = hint; t.classList.add('hinted');
        if (document.activeElement === t) t.select();
      }
    }
    q('.cd-cont').onclick = function (e) {
      const b = e.target.closest('button[data-cont]'); if (!b) return;
      contFor = this.last; this.hidden = true;
      if (b.getAttribute('data-cont') === '1') { clockSet(+b.getAttribute('data-min')); q('.cd-input').value = 'Kontynuujmy.'; }
      else q('.cd-input').value = 'Kończymy na dziś.';
      chatSend();
    };
    q('.cd-quick:not(.cd-cont)').onclick = function (e) {
      const b = e.target.closest('button[data-min]'); if (!b) return;
      const min = +b.getAttribute('data-min');
      clockSet(min); quickOff = true; q('.cd-quick').hidden = true;
      q('.cd-input').value = 'Mam ' + b.textContent + '.'; chatSend();
    };
    q('.cd-clock').onclick = function () { quickOff = false; q('.cd-quick:not(.cd-cont)').hidden = false; };
    function chatStart(resume) {
      api('/api/chat/start', { resume: resume }).then(function (s) { chatShow(s); q('.cd-input').focus(); }).catch(function (e) { msg(e.message); });
    }
    function chatSend() {
      const t = q('.cd-input'), text = t.value.trim();
      if (!text || !cstate.running) return;
      t.value = ''; t.classList.remove('hinted');
      const tq = q('.cd-quick:not(.cd-cont)');
      if (!tq.hidden) { const min = parseMinutes(text); if (min) clockSet(min); quickOff = true; tq.hidden = true; }
      const cq = q('.cd-cont');
      if (!cq.hidden) { contFor = cq.last; cq.hidden = true; if (/^(tak|kontynu|dalej|ok)/i.test(text)) clockSet(+cq.querySelector('[data-cont="1"]').getAttribute('data-min') || 10); }
      api('/api/chat/send', { text: text }).catch(function (e) { msg(e.message); t.value = text; });
    }
    q('.cd-send').onclick = chatSend;
    // propozycja zaznaczona: nowy tekst ja zastepuje, Enter wysyla
    q('.cd-input').addEventListener('focus', function () { if (this.classList.contains('hinted')) this.select(); });
    q('.cd-input').addEventListener('input', function () { this.classList.remove('hinted'); });
    q('.cd-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); chatSend(); }
    });
    // Dodatki zalezne od serwera - wylaczalne bloki (docs/specs/claude-chat.md)
    function chatExtras(st) {
      // DYKTOWANIE (0.38.0) start
      // przycisk 🎙: kursor w polu wiadomosci, serwer uruchamia dyktowanie systemu (dictate.js); wycofanie - docs/specs/claude-chat.md
      let mic = q('.cd-mic');
      if (!st.dictate) { if (mic) mic.remove(); return; }
      if (!mic) {
        mic = document.createElement('button'); mic.type = 'button'; mic.className = 'cd-mic';
        mic.title = 'Dyktuj - dyktowanie systemu albo skrót Twojego programu (Konfiguracja → Dyktowanie w czacie)'; mic.setAttribute('aria-label', 'Dyktuj');
        mic.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
        q('.cd-send').before(mic);
        q('.cd-input').placeholder = 'Napisz albo podyktuj wiadomość…';
        mic.onclick = function () {
          const t = q('.cd-input'); t.focus();
          api('/api/chat/dictate', {}).then(function () { q('.cd-hint2').textContent = 'dyktowanie włączone - mów, potem popraw i wyślij'; })
            .catch(function (e) { msg(e.message); });
        };
      }
      mic.disabled = !st.running;
      // DYKTOWANIE (0.38.0) koniec
    }
    markView();
    // Szerokosc: uchwyt po lewej krawedzi
    q('.cd-grip').addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault(); this.setPointerCapture(e.pointerId); dock.classList.add('resizing');
      const move = function (ev) { prefs.w = dockWidth(window.innerWidth - ev.clientX, window.innerWidth); layout(); };
      const up = function () {
        this.removeEventListener('pointermove', move); this.removeEventListener('pointerup', up);
        dock.classList.remove('resizing'); saveDock(prefs); refit(); window.dispatchEvent(new Event('resize'));
      };
      this.addEventListener('pointermove', move); this.addEventListener('pointerup', up);
    });
    window.addEventListener('focus', claim);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) claim(); });
    window.addEventListener('resize', function () { if (root.classList.contains('claude-on')) { layout(); clearTimeout(dock.rt); dock.rt = setTimeout(refit, 80); } });
    if (prefs.open) open(true);
  }

  // Obsluga przelacznika modulu: #modbtn (z .mname) + #modmenu w .modsw.
  // opts.onNew() - "Nowy modul…"; opts.onSelect(name) - przed przelaczeniem. Zwraca update(cur, mods).
  function modSwitch(opts) {
    opts = opts || {};
    const menu = document.getElementById('modmenu'), btn = document.getElementById('modbtn');
    let cur = null, mods = [], demo = false;
    if (!menu || !btn) return function (n, l, d) { demoBar(d || null); };
    const items = function () { return [].slice.call(menu.querySelectorAll('button')); };
    function open(on) {
      menu.hidden = !on; btn.setAttribute('aria-expanded', on);
      if (on) { menu.innerHTML = modMenu(mods, cur, demo); const c = menu.querySelector('[aria-checked="true"]') || items()[0]; if (c) c.focus(); }
    }
    btn.onclick = function () { open(menu.hidden); };
    menu.onclick = function (e) {
      const b = e.target.closest('button'); if (!b) return;
      open(false); btn.focus();
      if (b.id === 'newmod') { if (opts.onNew) opts.onNew(); return; }
      if (b.id === 'chroot') { if (opts.onRoot) opts.onRoot(); else location.href = '/#katalog'; return; }
      if (b.id === 'addproj') { if (opts.onAdd) opts.onAdd(); else location.href = '/#dodaj-projekt'; return; }
      const name = b.getAttribute('data-mod'), dir = b.getAttribute('data-dir');
      if (!name || b.getAttribute('aria-checked') === 'true') return;
      if (opts.onSelect) opts.onSelect(name);
      fetch(base(location.pathname) + '/api/modules/select', { method: 'POST', headers: { 'X-SDD': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(dir ? { dir: dir } : { name: name }) })
        .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || ('HTTP ' + r.status)); }); })
        .catch(function (err) { alert(err.message); });
    };
    menu.onkeydown = function (e) {
      const l = items(), i = l.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); l[(i - 1 + l.length) % l.length].focus(); }
      else if (e.key === 'Escape') { open(false); btn.focus(); }
    };
    document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.modsw')) open(false); });
    return function update(key, list, isDemo) {
      cur = key; mods = list || []; demo = !!isDemo;
      const m = mods.filter(function (x) { return isCur(x, key); })[0];
      btn.querySelector('.mname').textContent = (m && m.name) || key || '…';
      const bar = document.getElementById('topbar');
      if (bar) document.title = tabTitle((m && m.name) || '', bar.getAttribute('data-page'), !!isDemo);
      demoBar(isDemo || null);
    };
  }
  api.modSwitch = modSwitch;

  // Pasek "DEMO - tylko podglad" pod gornym paskiem (0.11.0) z przelacznikiem Start warsztatu | Wynik (0.12.0).
  const DEMO_TEXT = {
    start: 'Tak wygląda tablica na początku warsztatu: karteczki z pierwszej rozmowy, czerwone pytania, nic jeszcze w plikach.',
    wynik: 'Tak wygląda moduł po przejściu SDD: wymagania zatwierdzone, walidacja 100%, model na tablicy.',
  };
  function demoBar(kind) {
    let el = document.getElementById('demobar');
    if (!kind) { if (el) el.remove(); return; }
    const bar = document.getElementById('topbar'); if (!bar) return;
    if (!el) {
      el = document.createElement('div');
      el.id = 'demobar'; el.className = 'demobar'; el.setAttribute('role', 'note');
      bar.insertAdjacentElement('afterend', el);
    }
    if (el.getAttribute('data-kind') === kind) return;
    el.setAttribute('data-kind', kind);
    const sw = [['start', '/demo/start', 'Start warsztatu'], ['wynik', '/demo', 'Wynik']].map(function (x) {
      return x[0] === kind ? '<span aria-current="page">' + x[2] + '</span>' : '<a href="' + x[1] + '">' + x[2] + '</a>';
    }).join('');
    el.innerHTML = '<span class="dsw">' + sw + '</span><span><b>DEMO - tylko podgląd.</b> ' + DEMO_TEXT[kind] + ' Zmiany są wyłączone.</span>';
  }
  api.demoBar = demoBar;

  function init() { const bar = document.getElementById('topbar'); if (bar) render(bar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return api;
});

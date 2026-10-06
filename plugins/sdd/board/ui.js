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
  function versionBadge(v) {
    if (!v || !v.running) return null;
    const server = !!v.disk && v.disk !== v.running;
    const plugin = !!v.plugin && !!v.disk && v.plugin !== v.disk;
    const tips = [];
    if (server) tips.push('Serwer działa na wersji ' + v.running + ', a zainstalowana jest ' + v.disk +
      '. Zrestartuj serwer: zatrzymaj sdd-board (Ctrl+C) i uruchom ponownie (albo restart w HQAI).');
    if (plugin) tips.push('Plugin w Claude Code ma wersję ' + v.plugin + ', a kit na dysku ' + v.disk +
      '. Zaktualizuj: claude plugin marketplace update sdd-kit && claude plugin update sdd@sdd-kit,' +
      ' potem restart sesji Claude Code.');
    // Sesje Claude Code (0.32.0, AC-SV6): znaczniki z hooka pluginu - wersja skilli, ktora sesja zaladowala
    const sessions = Array.isArray(v.sessions) ? v.sessions : [];
    const old = sessions.filter(s => s.stale);
    if (old.length) tips.push('Sesje Claude Code na starszej wersji skilli:\n' +
      old.map(s => '  ' + (s.cwd || '?') + ' - ' + s.version).join('\n') +
      '\nZamknij te sesje i otwórz nową - skille ładują się przy starcie sesji.');
    else if (sessions.length) tips.push(sessions.length + ' otwart' + (sessions.length === 1 ? 'a sesja' : 'e sesje') +
      ' Claude Code na wersji ' + sessions[0].version + '.');
    return { stale: server || plugin || old.length > 0,
      text: 'v' + v.running + (server ? ' · serwer nieaktualny' : '') + (plugin ? ' · plugin nieaktualny' : '') +
        (old.length ? ' · sesja Claude nieaktualna' : ''),
      title: (tips.length ? tips.join('\n') : 'sdd-kit ' + v.running) + '\nKliknij: opis zmian tej wersji na GitHubie',
      href: RELEASES + v.running };
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
      (cfg ? '<a class="ic cfg" href="' + cfg + '" title="Konfiguracja" aria-label="Konfiguracja"' + (page === 'config' ? ' aria-current="page"' : '') + '>⚙︎</a>' : '') +
      claude + '</div>';
  }

  const api = { topbarHtml, pickTheme, base, tabs, cfgHref, modMenu, cardOpen, countList, metaHtml, tagClass, ABBR, abbr, marks, versionBadge, dockWidth, termOptions, termKey, slug, tabTitle, KEY };
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
      const x = versionBadge(v);
      if (!x || !el) return;
      el.textContent = x.text; el.title = x.title; el.href = x.href; el.classList.toggle('stale', x.stale); el.hidden = false;
      const logo = bar.querySelector('.logo');
      if (logo) logo.title = 'sdd-kit ' + x.text;
    }).catch(function () {});
    if (!b) { claudeDock(bar.querySelector('.cl-btn')); updateChip(bar); }
  }

  // ---------------------------------------------------------------- nowa wersja z GitHuba (0.27.0, docs/specs/update.md)
  function updateChip(bar) {
    fetch('/api/update').then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
      if (!st || !st.newer) return;
      const ver = bar.querySelector('.theme-btn'), wrap = document.createElement('span');
      wrap.className = 'upd';
      wrap.innerHTML = '<button type="button" class="upd-btn" aria-expanded="false" title="Dostępna nowa wersja sdd-kit">↑ ' + st.latest + '</button>' +
        '<div class="upd-pop" role="dialog" aria-label="Nowa wersja sdd-kit" hidden>' +
        '<p><b>Dostępna wersja ' + st.latest + '</b> (masz ' + st.current + ').</p>' +
        '<p><a href="' + (st.url || '#') + '" target="_blank" rel="noopener">Co nowego ↗</a></p>' +
        (st.canUpdate ? '<p class="upd-note">Pobierze nową wersję z GitHuba i zaktualizuje dodatek w Claude Code.</p>'
          : '<p class="upd-note">' + String(st.reason || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</p>') +
        '<p class="upd-msg" hidden></p><pre class="upd-log" hidden></pre>' +
        '<div class="upd-row">' + (st.canUpdate ? '<button type="button" class="upd-go">Aktualizuj</button>' : '') +
        '<button type="button" class="upd-x">Później</button></div></div>';
      (ver ? ver.parentNode : bar.querySelector('.right')).insertBefore(wrap, ver);
      const btn = wrap.querySelector('.upd-btn'), pop = wrap.querySelector('.upd-pop');
      function open(on) { pop.hidden = !on; btn.setAttribute('aria-expanded', on); }
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

  function claudeDock(btn) {
    if (!btn) return;
    const root = document.documentElement, prefs = dockPrefs();
    let term = null, fit = null, es = null, state = {}, pending = '', sending = false, rtimer = null;
    const dock = document.createElement('aside');
    dock.className = 'cdock'; dock.setAttribute('aria-label', 'Claude Code');
    dock.innerHTML = '<div class="cd-grip" title="Przeciągnij, żeby zmienić szerokość"></div>' +
      '<div class="cd-head"><b>Claude Code</b><span class="cd-cwd"></span>' +
      '<button type="button" class="cd-run" hidden>Uruchom Claude</button><button type="button" class="cd-new" hidden>Nowa rozmowa</button>' +
      '<button type="button" class="cd-stop" hidden>Zakończ</button>' +
      '<button type="button" class="cd-x" aria-label="Zamknij okno" title="Zamknij okno (Claude działa dalej)">×</button></div>' +
      '<p class="cd-msg" hidden></p><div class="cd-term"></div>';
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
      else if (!run && resume) msg('W tym module jest zapisana rozmowa z Claude - możesz ją wznowić albo zacząć nową.');
      else if (!run) msg('Claude Code uruchomi się w folderze modułu' + (state.module ? ' ' + state.module : '') + '.');
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
      if (on) { layout(); refresh(); setup().then(function () { refit(); if (term) term.focus(); }); }
      else if (es) { es.close(); es = null; }
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
    q('.cd-run').onclick = function () { start(!!state.canResume); };
    q('.cd-new').onclick = function () { start(false); };
    q('.cd-stop').onclick = function () {
      if (!confirm('Zakończyć sesję Claude Code? Rozmowa w terminalu zostanie przerwana.')) return;
      api('/api/term/stop').catch(function (e) { msg(e.message); });
    };
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

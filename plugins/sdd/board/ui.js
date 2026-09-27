// Pasek na gorze panelu i tablicy: zakladki Panel / Tablica i motyw jasny / ciemny (slonce / ksiezyc).
// Wspolny dla przegladarki (window.SddUI) i testow (require). Kryteria: docs/specs/ui-switch.md.
// W przegladarce ladowany w <head> bez defer, zeby motyw byl ustawiony przed pierwszym malowaniem.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SddUI = factory();
})(this, function () {
  'use strict';

  const KEY = 'sdd-theme';
  const SUN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">' +
    '<path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>';
  const THEMES = [['light', 'Jasny motyw', SUN], ['dark', 'Ciemny motyw', MOON]];

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
    // /demo/start nie ma plikow requirements/, wiec nie ma panelu
    if (b === '/demo/start') return [{ href: b, label: 'Tablica warsztatowa', short: 'Tablica', current: true }];
    return [
      { href: b || '/', label: 'Panel modułu', short: 'Panel', current: page === 'panel' },
      { href: b + '/board', label: 'Tablica warsztatowa', short: 'Tablica', current: page === 'board' },
    ];
  }

  const LEVEL = { full: 'pełny', light: 'lekki' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Menu modulow w naglowku "Wymagania do modulu: X ▾" (panel i tablica).
  // demo (0.11.0): bez "Nowy modul…" i "Zmien katalog…" - demo nie dotyka modulow usera.
  function modMenu(mods, cur, demo) {
    const list = (mods || []).slice();
    if (cur && !list.some(function (m) { return m.name === cur; })) list.unshift({ name: cur });
    return '<div class="mh">Moduły</div><ul>' + list.map(function (m) {
      const on = m.name === cur;
      return '<li><button type="button" role="menuitemradio" aria-checked="' + on + '" data-mod="' + esc(m.name) + '"><span class="ck">' + (on ? '✓' : '') + '</span>' +
        '<span class="nm">' + esc(m.name) + '</span><span class="lv">' + esc(LEVEL[m.level] || m.level || '') + '</span></button></li>';
    }).join('') + '</ul>' + (demo ? '' : '<div class="sep"></div><button type="button" role="menuitem" class="add" id="newmod"><span class="ck">+</span>Nowy moduł…</button>' +
      '<button type="button" role="menuitem" class="add" id="chroot"><span class="ck">⌂</span>Zmień katalog modułów…</button>');
  }

  // Karta etapu w panelu (zmiana 0.10.0): wybor usera, a bez niego rozwinieta tylko karta aktualnego kroku.
  function cardOpen(key, current, toggled) {
    return toggled && typeof toggled[key] === 'boolean' ? toggled[key] : key === current;
  }

  const api = { pickTheme, base, tabs, modMenu, cardOpen, KEY };
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

  function mark(bar, t) {
    bar.querySelectorAll('input[name="sdd-theme"]').forEach(function (i) { i.checked = i.value === t; });
  }

  function render(bar) {
    const page = bar.getAttribute('data-page');
    const t = load();
    const b = base(location.pathname);
    // Twoj modul: link do przykladu w nowym oknie; demo: powrot do Twojego modulu (zmiana 0.12.0)
    const link = b ? '<a class="xlink" href="/"><span class="long">← Twój moduł</span><span class="short">← Twój</span></a>'
      : '<a class="xlink" href="/demo" target="_blank" rel="noopener"><span class="long">Przykład gotowego modułu ↗</span><span class="short">Przykład ↗</span></a>';
    bar.innerHTML =
      '<div class="tabs">' + tabs(page, b).map(function (x) {
        const inner = '<span class="long">' + x.label + '</span><span class="short">' + x.short + '</span>';
        return x.current ? '<span class="tab" aria-current="page">' + inner + '</span>' : '<a class="tab" href="' + x.href + '">' + inner + '</a>';
      }).join('') + '</div>' +
      '<div class="right">' + link +
      '<div class="theme" role="radiogroup" aria-label="Motyw">' + THEMES.map(function (x) {
        return '<label title="' + x[1] + '"><input type="radio" name="sdd-theme" value="' + x[0] + '" aria-label="' + x[1] + '"' +
          (x[0] === t ? ' checked' : '') + '><span>' + x[2] + '</span></label>';
      }).join('') + '</div></div>';
    bar.addEventListener('change', function (e) {
      if (e.target.name !== 'sdd-theme') return;
      save(pickTheme(e.target.value, false)); apply();
    });
    // zmiana w innej karcie (panel <-> tablica)
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY && e.key !== null) return;
      apply(); mark(bar, load());
    });
    // bez zapisanego wyboru zaznaczenie idzie za systemem
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { mark(bar, load()); });
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
      const name = b.getAttribute('data-mod');
      if (!name || name === cur) return;
      if (opts.onSelect) opts.onSelect(name);
      fetch(base(location.pathname) + '/api/modules/select', { method: 'POST', headers: { 'X-SDD': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name }) })
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
    return function update(name, list, isDemo) {
      cur = name; mods = list || []; demo = !!isDemo;
      btn.querySelector('.mname').textContent = name || '…';
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

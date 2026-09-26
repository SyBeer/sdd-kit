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

  function tabs(page) {
    return [
      { href: '/', label: 'Panel modułu', short: 'Panel', current: page === 'panel' },
      { href: '/board', label: 'Tablica warsztatowa', short: 'Tablica', current: page === 'board' },
    ];
  }

  const api = { pickTheme, tabs, KEY };
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
    bar.innerHTML =
      '<div class="tabs">' + tabs(page).map(function (x) {
        const inner = '<span class="long">' + x.label + '</span><span class="short">' + x.short + '</span>';
        return x.current ? '<span class="tab" aria-current="page">' + inner + '</span>' : '<a class="tab" href="' + x.href + '">' + inner + '</a>';
      }).join('') + '</div>' +
      '<div class="theme" role="radiogroup" aria-label="Motyw">' + THEMES.map(function (x) {
        return '<label title="' + x[1] + '"><input type="radio" name="sdd-theme" value="' + x[0] + '" aria-label="' + x[1] + '"' +
          (x[0] === t ? ' checked' : '') + '><span>' + x[2] + '</span></label>';
      }).join('') + '</div>';
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

  function init() { const bar = document.getElementById('topbar'); if (bar) render(bar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return api;
});

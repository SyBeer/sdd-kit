// Pasek na gorze panelu i tablicy: zakladki Panel / Tablica i motyw Auto / Jasny / Ciemny.
// Wspolny dla przegladarki (window.SddUI) i testow (require). Kryteria: docs/specs/ui-switch.md.
// W przegladarce ladowany w <head> bez defer, zeby motyw byl ustawiony przed pierwszym malowaniem.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SddUI = factory();
})(this, function () {
  'use strict';

  const KEY = 'sdd-theme';
  const THEMES = [['auto', 'Auto', 'Jak w systemie'], ['light', 'Jasny', ''], ['dark', 'Ciemny', '']];

  function normTheme(v) { return v === 'light' || v === 'dark' ? v : 'auto'; }

  function tabs(page) {
    return [
      { href: '/', label: 'Panel modułu', short: 'Panel', current: page === 'panel' },
      { href: '/board', label: 'Tablica warsztatowa', short: 'Tablica', current: page === 'board' },
    ];
  }

  const api = { normTheme, tabs, KEY };
  if (typeof document === 'undefined') return api;

  // ---------------------------------------------------------------- przegladarka
  function load() { try { return normTheme(localStorage.getItem(KEY)); } catch (e) { return 'auto'; } }
  function save(t) { try { if (t === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch (e) {} }
  function apply(t) {
    const el = document.documentElement;
    if (t === 'auto') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', t);
  }
  apply(load());

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
        return '<label' + (x[2] ? ' title="' + x[2] + '"' : '') + '><input type="radio" name="sdd-theme" value="' + x[0] + '"' +
          (x[0] === t ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
      }).join('') + '</div>';
    bar.addEventListener('change', function (e) {
      if (e.target.name !== 'sdd-theme') return;
      const v = normTheme(e.target.value);
      save(v); apply(v);
    });
    // zmiana w innej karcie (panel <-> tablica)
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY && e.key !== null) return;
      const v = load(); apply(v); mark(bar, v);
    });
  }

  function init() { const bar = document.getElementById('topbar'); if (bar) render(bar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return api;
});

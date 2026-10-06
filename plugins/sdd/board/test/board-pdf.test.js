// Eksport Tablicy do PDF jako jedna strona. Kryteria z docs/specs/board-pdf.md (AC-BP1..AC-BP5, zmiana 0.35.0).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ops = require('../board-ops.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const printCss = (html.match(/@media print\{[\s\S]*?\n\}/) || [''])[0];

test('AC-BP1: przycisk PDF w pasku narzedzi, ukryty na telefonie i na pustej tablicy', () => {
  assert.match(html, /<button class="b" id="pdf" title="Eksport całej tablicy do PDF - jedna strona">PDF<\/button>/);
  assert.match(html, /@media\(max-width:640px\)\{[\s\S]*?#pdf,\.pdfsep\{display:none\}/);
  assert.match(html, /\$\('#pdf'\)\.hidden=!board\.lanes\.length/);
});

test('AC-BP2: boardPageSize - wymiary tresci + 24 px marginesu, w gore, minimum 400 x 300', () => {
  assert.deepStrictEqual(ops.boardPageSize(1000, 700), { w: 1048, h: 748, css: '@page{size:1048px 748px;margin:0}' });
  assert.deepStrictEqual(ops.boardPageSize(1000.2, 700.5), { w: 1049, h: 749, css: '@page{size:1049px 749px;margin:0}' });
  assert.deepStrictEqual(ops.boardPageSize(10, 10), { w: 400, h: 300, css: '@page{size:400px 300px;margin:0}' });
  assert.deepStrictEqual(ops.boardPageSize(0, NaN), { w: 400, h: 300, css: '@page{size:400px 300px;margin:0}' });
});

test('AC-BP3: PDF w nowym oknie (?pdf=1) - tam jasny motyw, 100% bez zapisu, uklad wydruku, @page, okno drukowania raz', () => {
  const f = html.slice(html.indexOf('function exportPdf'), html.indexOf('function exportPdf') + 300);
  assert.match(f, /window\.open\(location\.pathname\+'\?pdf=1','_blank'\)/);
  assert.doesNotMatch(f, /window\.print/);
  const l = html.slice(html.indexOf('var PDF_MODE'), html.indexOf('function exportPdf'));
  ['data-theme', "'light'", 'setZoom(1,true)', "classList.add('printing')", 'BoardOps.boardPageSize', 'window.print()', 'printed=true', 'document.fonts']
    .forEach(t => assert.ok(l.includes(t), t));
  assert.match(html, /if\(noSave\) return;/);
  assert.match(html, /safeRender\(\); pdfRendered\(\);/);
  assert.match(html, /\$\('#pdf'\)\.onclick=exportPdf/);
  // okno eksportu bez okna Claude (nie przejmuje rozmiaru terminala)
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'ui.js'), 'utf8'), /if \(!b && !\/\[\?&\]pdf=1\(&\|\$\)\/\.test\(location\.search\)\) \{ claudeDock/);
});

test('AC-BP4: @media print - bez elementow pracy, bez przewijania, pelny tekst, kolory drukowane', () => {
  assert.ok(printCss, 'brak @media print');
  ['.statusbar', '.topbar', '.tbar', '#drawer', '.cdock', '.addnote', '.ltools', '.ins-h', '.ins-v', '.msg', '.switched', '.demobar', '.tip']
    .forEach(t => assert.ok(printCss.includes(t), t));
  assert.match(printCss, /print-color-adjust:exact/);
  assert.match(printCss, /\.note \.txt\{max-height:none/);
  assert.match(printCss, /\.note \.ans\{-webkit-line-clamp:unset/);
  assert.match(printCss, /#board\{overflow:visible/);
  // ten sam uklad na ekranie pod klasa printing - pomiar strony = wydruk
  assert.match(html, /html\.printing \.note \.txt\{max-height:none/);
  assert.match(html, /html\.printing body\{display:block!important;padding:24px\}/);
  assert.match(printCss, /\.lane-title,\.ruler,\.ruler \.corner\{position:static/);
  assert.match(printCss, /#printhead\{display:block/);
});

test('AC-BP5: naglowek eksportu - modul, tytul, data, legenda typow i stanow plikow', () => {
  assert.match(html, /<header id="printhead"/);
  assert.match(html, /#printhead\{display:none\}/);
  const f = html.slice(html.indexOf('function printHead'), html.indexOf('function printHead') + 1500);
  ['eksport ', 'zdarzenie', 'komenda', 'kto', 'reguła', 'widok', 'nie wiemy', 'w plikach', 'zmienione', 'tylko na tablicy', 'brak w pliku', 'board.title']
    .forEach(t => assert.ok(f.includes(t), t));
});

#!/usr/bin/env node
'use strict';
// Ikona aplikacji (spec: docs/specs/ui-switch.md AC-U18): ten sam rysunek co plugins/sdd/board/favicon.svg,
// rasteryzowany do PNG 32x32 i 180x180 (apple-touch-icon). Bez zaleznosci: prostokaty z zaokragleniem,
// wygladzanie przez probkowanie 4x4 na piksel. Uruchom po zmianie ikony: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ksztalty w ukladzie 32x32 - jak w favicon.svg
const SHAPES = [
  { x: 0, y: 0, w: 32, h: 32, r: 7, c: [0x26, 0x24, 0x1f] },
  { x: 5, y: 6, w: 10, h: 9, r: 1.5, c: [0xf5, 0xa1, 0x3a] },
  { x: 17, y: 6, w: 10, h: 9, r: 1.5, c: [0x5a, 0xa0, 0xe6] },
  { x: 5, y: 17, w: 10, h: 9, r: 1.5, c: [0xf7, 0xe3, 0x6b] },
  { x: 17, y: 17, w: 10, h: 9, r: 1.5, c: [0xe8, 0x50, 0x3f] },
];

function inside(s, px, py) {
  if (px < s.x || py < s.y || px > s.x + s.w || py > s.y + s.h) return false;
  const cx = Math.min(Math.max(px, s.x + s.r), s.x + s.w - s.r);
  const cy = Math.min(Math.max(py, s.y + s.r), s.y + s.h - s.r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= s.r ** 2;
}

function render(size) {
  const k = 32 / size, N = 4, rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);  // filtr 0 + RGBA
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
        const px = (x + (sx + 0.5) / N) * k, py = (y + (sy + 0.5) / N) * k;
        let col = null;
        SHAPES.forEach(s => { if (inside(s, px, py)) col = s.c; });  // pozniejszy ksztalt na wierzchu
        if (col) { r += col[0]; g += col[1]; b += col[2]; a += 1; }
      }
      const o = 1 + x * 4;
      if (a) { row[o] = Math.round(r / a); row[o + 1] = Math.round(g / a); row[o + 2] = Math.round(b / a); }
      row[o + 3] = Math.round(255 * a / (N * N));
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;  // 8 bit, RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const OUT = path.join(__dirname, '..', 'plugins', 'sdd', 'board');
fs.writeFileSync(path.join(OUT, 'favicon.png'), render(32));
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), render(180));
console.log('zapisano favicon.png (32) i apple-touch-icon.png (180) w ' + OUT);

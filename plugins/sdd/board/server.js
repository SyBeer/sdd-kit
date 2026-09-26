#!/usr/bin/env node
// Lokalna tablica warsztatowa dla sdd-kit.
// Uruchom:  node server.js [sciezka/do/board.json] [port]
// Agent (Claude Code) pisze do board.json, przegladarka odswieza sie sama.
// Przegladarka zapisuje przesuniecia i nowe karteczki z powrotem do board.json.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const BOARD = path.resolve(process.argv[2] || 'requirements/01-interview/board.json');
const PORT = parseInt(process.argv[3] || process.env.PORT || '4242', 10);
const UI = path.join(__dirname, 'index.html');

function emptyBoard() {
  return { title: 'Warsztat', subtitle: '', lanes: ['Proces 1'], notes: [], updated: new Date().toISOString() };
}
function readBoard() {
  try { return JSON.parse(fs.readFileSync(BOARD, 'utf8')); }
  catch (e) { return emptyBoard(); }
}
function writeBoard(b) {
  b.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(BOARD), { recursive: true });
  fs.writeFileSync(BOARD, JSON.stringify(b, null, 2));
}
if (!fs.existsSync(BOARD)) writeBoard(emptyBoard());

const clients = new Set();
function broadcast() {
  const data = `data: ${JSON.stringify(readBoard())}\n\n`;
  for (const res of clients) res.write(data);
}
let timer = null;
fs.watch(path.dirname(BOARD), (ev, file) => {
  if (file && file !== path.basename(BOARD)) return;
  clearTimeout(timer); timer = setTimeout(broadcast, 120);
});

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(UI).pipe(res);
  }
  if (url === '/api/board' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(readBoard()));
  }
  if (url === '/api/board' && req.method === 'PUT') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { writeBoard(JSON.parse(body)); res.writeHead(204); res.end(); }
      catch (e) { res.writeHead(400); res.end('zly JSON'); }
    });
    return;
  }
  if (url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(readBoard())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  res.writeHead(404); res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Tablica:  http://localhost:${PORT}`);
  console.log(`Plik:     ${BOARD}`);
  console.log('Zostaw to okno otwarte. Ctrl+C konczy.');
});

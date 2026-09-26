#!/usr/bin/env node
// Lokalna tablica warsztatowa dla sdd-kit.
// Uruchom:  node server.js [sciezka/do/board.json] [port]
// Agent (Claude Code) pisze do board.json, przegladarka odswieza sie sama.
// Przegladarka zapisuje przesuniecia i nowe karteczki z powrotem do board.json.
// Strony:  /  postep procesu SDD (tylko podglad),  /board  tablica warsztatowa.
// Katalog wymagan: SDD_REQ albo nadrzedny 'requirements/' pliku tablicy, albo ./requirements.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const BOARD = path.resolve(process.argv[2] || 'requirements/01-interview/board.json');
const PORT = parseInt(process.argv[3] || process.env.PORT || '4242', 10);
const UI = path.join(__dirname, 'index.html');
const PROGRESS_UI = path.join(__dirname, 'progress.html');
const { readProgress } = require('./progress');

function findReqDir() {
  if (process.env.SDD_REQ) return path.resolve(process.env.SDD_REQ);
  const parts = BOARD.split(path.sep);
  const i = parts.lastIndexOf('requirements');
  return i > 0 ? parts.slice(0, i + 1).join(path.sep) : path.resolve('requirements');
}
const REQ = findReqDir();

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

// Postep: SSE przy kazdej zmianie w requirements/ (rekurencyjnie).
const progressClients = new Set();
function broadcastProgress() {
  const data = `data: ${JSON.stringify(readProgress(REQ))}\n\n`;
  for (const res of progressClients) res.write(data);
}
let ptimer = null;
function watchReq() {
  try {
    fs.watch(REQ, { recursive: true }, () => { clearTimeout(ptimer); ptimer = setTimeout(broadcastProgress, 150); });
  } catch (e) {
    setTimeout(watchReq, 3000); // requirements/ jeszcze nie ma - sprobuj pozniej
  }
}
watchReq();

function sendHtml(res, file) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/progress') return sendHtml(res, PROGRESS_UI);
  if (url === '/board' || url === '/index.html') return sendHtml(res, UI);
  if (url === '/api/progress' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(readProgress(REQ)));
  }
  if (url === '/progress-events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(readProgress(REQ))}\n\n`);
    progressClients.add(res);
    req.on('close', () => progressClients.delete(res));
    return;
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
  console.log(`Postep:   http://localhost:${PORT}`);
  console.log(`Tablica:  http://localhost:${PORT}/board`);
  console.log(`Wymagania: ${REQ}`);
  console.log(`Plik:     ${BOARD}`);
  console.log('Zostaw to okno otwarte. Ctrl+C konczy.');
});

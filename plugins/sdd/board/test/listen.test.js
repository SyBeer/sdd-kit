// Nasluch serwera na 127.0.0.1 i ::1 (AC-T15, zmiana 0.34.1): Windows laczy "localhost" najpierw z ::1.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const B = path.join(__dirname, '..');
const has6 = Object.values(os.networkInterfaces()).flat().some(i => i && i.family === 'IPv6' && i.internal);
const get = (host, port, p) => new Promise((ok, err) => http.get({ host, port, path: p, family: host.includes(':') ? 6 : 4 },
  r => { r.resume(); r.on('end', () => ok(r.statusCode)); }).on('error', err));

test('AC-T15: serwer odpowiada na 127.0.0.1 i na ::1, nie na adresach zewnetrznych', { skip: has6 ? false : 'brak IPv6 loopback' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-listen-'));
  const board = path.join(dir, 'requirements', '01-interview', 'board.json');
  fs.mkdirSync(path.dirname(board), { recursive: true });
  fs.writeFileSync(board, '{"title":"t","lanes":[],"notes":[]}');
  const port = 5700 + Math.floor(Math.random() * 300);
  const env = Object.assign({}, process.env, { SDD_CONFIG: path.join(dir, 'config.json') });
  const srv = spawn(process.execPath, [path.join(B, 'server.js'), board, String(port)], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise((ok, err) => { srv.stdout.once('data', ok); srv.once('exit', c => err(new Error('serwer: ' + c))); });
    assert.strictEqual(await get('127.0.0.1', port, '/api/version'), 200);
    let code = null;
    for (let i = 0; i < 20 && code === null; i++) {
      try { code = await get('::1', port, '/api/version'); } catch (e) { await new Promise(r => setTimeout(r, 50)); }
    }
    assert.strictEqual(code, 200, '::1');
  } finally { srv.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('AC-T15: nasluch tylko na adresach petli zwrotnej', () => {
  const s = fs.readFileSync(path.join(B, 'server.js'), 'utf8');
  assert.match(s, /server\.listen\(PORT, '127\.0\.0\.1'/);
  assert.match(s, /s6\.listen\(PORT, '::1'\)/);
  assert.doesNotMatch(s, /listen\(PORT\)|'0\.0\.0\.0'|listen\(PORT, '::'\)/);
});

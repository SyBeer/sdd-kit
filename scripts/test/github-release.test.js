'use strict';
// Spec: docs/specs/github-release.md
const test = require('node:test');
const assert = require('node:assert');
const { parseChangelog, selectVersions, releasePayload, findEntry } = require('../github-release.js');

const CL = `# Changelog

## [Niewydane]
- cos w toku

## [0.20.0] - 2026-09-27
Opis.
- punkt a

## [0.19.1] - 2026-09-26
- poprawka

## [0.19.0] - 2026-09-25
- nowosc

## [0.9.0] - 2026-09-01
- stara
`;

test('AC-G1: sekcje z wersja, data i trescia; Niewydane pominiete', () => {
  const e = parseChangelog(CL);
  assert.deepStrictEqual(e.map(x => x.version), ['0.20.0', '0.19.1', '0.19.0', '0.9.0']);
  assert.strictEqual(e[0].date, '2026-09-27');
  assert.strictEqual(e[0].body, 'Opis.\n- punkt a');
  assert.strictEqual(e[3].body, '- stara');
});

test('AC-G2: wersje od 0.19.0 rosnaco wg semver', () => {
  const e = parseChangelog(CL);
  assert.deepStrictEqual(selectVersions(e, '0.19.0').map(x => x.version), ['0.19.0', '0.19.1', '0.20.0']);
  assert.deepStrictEqual(selectVersions(e, '0.9.0').map(x => x.version), ['0.9.0', '0.19.0', '0.19.1', '0.20.0']);
});

test('AC-G3: payload Release, latest tylko najwyzsza', () => {
  const e = parseChangelog(CL);
  const top = releasePayload(e[0], e);
  assert.deepStrictEqual(top, { tag_name: 'v0.20.0', name: 'v0.20.0 (2026-09-27)', body: 'Opis.\n- punkt a', make_latest: 'true' });
  assert.strictEqual(releasePayload(e[1], e).make_latest, 'false');
});

test('AC-G4: brak sekcji w CHANGELOG to blad', () => {
  const e = parseChangelog(CL);
  assert.strictEqual(findEntry(e, '0.19.1').body, '- poprawka');
  assert.throws(() => findEntry(e, '0.21.0'), /0\.21\.0/);
});

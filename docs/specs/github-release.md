# Spec: Release Notes na GitHubie

Status: zatwierdzony zakres 2026-10-03 (user: "przy kazdej puszowanej zmianie masz opisac zmiany";
uzupelnienie wstecz: od 0.19.0)
Wersja docelowa: 0.25.0

## Cel
Kazda wersja wypchnieta na GitHub (SyBeer/sdd-kit) ma strone Release z opisem zmian, wiec link z wersji
w gornym pasku aplikacji (osobny punkt kolejki) prowadzi do konkretnej tresci, a nie do golego tagu.

## Zakres
1. Skrypt `scripts/github-release.js` (Node, bez zaleznosci):
   - `node scripts/github-release.js 0.24.0` - Release dla tagu `v0.24.0`;
   - `node scripts/github-release.js --from 0.19.0` - Release dla kazdej wersji z CHANGELOG >= 0.19.0, rosnaco;
   - `--dry-run` - wypisuje, co by wyslal, bez wywolan zapisujacych.
2. Tresc Release = sekcja `## [X.Y.Z] - data` z `CHANGELOG.md` bez linii naglowka. Tytul: `vX.Y.Z (data)`.
3. Idempotentnie: Release dla tagu istnieje -> aktualizacja tresci i tytulu (PATCH), brak -> utworzenie (POST).
   Ponowne uruchomienie nie tworzy duplikatow.
4. Tag musi juz byc na GitHubie; brak tagu -> blad dla tej wersji (GitHub nie moze zalozyc tagu sam z `main`).
5. Wersja bez sekcji w CHANGELOG -> blad, nic nie wysylane (opis zmian jest obowiazkowy).
6. "Latest" dostaje tylko najwyzsza wersja z CHANGELOG; starsze `make_latest: false` (uzupelnianie wstecz nie
   przestawia najnowszego wydania).
7. Token: zmienna `GITHUB_TOKEN`, a gdy jej brak - `git credential fill` dla `https://github.com`. Token nie jest
   wypisywany.
8. Procedura wydania: po `git push origin main --tags` zawsze `node scripts/github-release.js <wersja>`.

## Kryteria akceptacji
- AC-G1: `parseChangelog` zwraca wersje, date i tresc kazdej sekcji; tresc bez naglowka i bez pustych linii na
  koncach; sekcja `[Niewydane]` pominieta.
- AC-G2: `selectVersions(entries, '0.19.0')` zwraca wersje >= 0.19.0 rosnaco wg semver (0.19.1 < 0.20.0 < 0.23.1).
- AC-G3: `releasePayload` daje `tag_name` `vX.Y.Z`, `name` `vX.Y.Z (data)`, `body` = tresc sekcji, `make_latest`
  `"true"` tylko dla najwyzszej wersji, inaczej `"false"`.
- AC-G4: wersja bez sekcji w CHANGELOG -> `findEntry` rzuca blad z nazwa wersji.
- AC-G5 (reczne): po `--from 0.19.0` GitHub ma Releases 0.19.0..0.24.0 (8), 0.24.0 oznaczone jako Latest;
  ponowne uruchomienie nie zmienia liczby Releases.

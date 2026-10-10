# Spec: "Pokaż zmiany" i "Przywróć" przy zapisanych wersjach (zmiana 0.42.0)

Status: zlecone przez wlasciciela produktu 2026-10-10 ("dodaj do panelu Pokaż zmiany i Przywróć"). Rozszerza
docs/specs/repo-copy.md (0.41.0 mialo przywracanie i porownanie poza zakresem).

## Problem
Wersje (0.41.0) da sie zapisac, ale nie da sie ich obejrzec ani wczytac bez gita (`git diff`, `git checkout`).
Uzytkownik biznesowy tego nie zrobi, a reczny `git checkout <wersja> -- requirements/` po cichu nadpisuje
niezapisane zmiany i zmienia indeks.

## Cel
Z listy wersji w panelu: zobaczyc, co sie zmienilo od wersji do dzis, i wrocic do niej jednym kliknieciem - bez
ryzyka utraty obecnej pracy.

Metryka: przywrocenie wersji bez terminala; po przywroceniu poprzedni stan zawsze jest na liscie wersji.

## Decyzje
1. "Pokaż zmiany" odpowiada na dwa pytania (zmiana 2026-10-10 po uwadze wlasciciela: przy najnowszej wersji, zapisanej
   po dodaniu 2 karteczek, widzial tylko "Bez zmian" i spodziewal sie zobaczyc te karteczki):
   - **"Co nowego w tej wersji"** - poprzednia wersja na liscie -> ta wersja. Gdy wersja jest najstarsza: poprzednia
     kopia (rodzic kopii, w ktorej powstala wersja) -> ta wersja; gdy to pierwsza kopia - wszystkie pliki jako dodane.
   - **"Od tej wersji do dziś"** - wersja -> pliki na dysku w `requirements/` (takze niezacommitowane i nowe), przez
     zwykla kopie (bez zmian - bez nowej kopii). Pomaga zdecydowac, czy przywracac. Pusta -> "Od tej wersji nic się
     nie zmieniło."
2. Przywrocenie dotyczy **calego `requirements/` modulu**: pliki z wersji wracaja, pliki dodane po wersji sa usuwane.
   Nie ma przywracania pojedynczego pliku (poza zakresem).
3. **Siatka bezpieczenstwa:** przed przywroceniem panel sam zapisuje obecny stan jako wersje
   "przed przywróceniem <nazwa> <GG:MM>". Wraca sie do niego tym samym "Przywróć". Usuwane sa tylko pliki, ktore sa
   w tej wersji bezpieczenstwa - pliki pominiete w kopii (> 10 MB) i ignorowane przez `.gitignore` zostaja nietkniete.
4. Potwierdzenie w miejscu (pod wersja), nie okno przegladarki: co sie stanie + "Przywróć" / "Anuluj".
5. Przywrocenie zmienia **tylko pliki robocze** w `requirements/`: `HEAD`, `main`, indeks bez zmian (tymczasowy indeks,
   jak kopia). Commit na `main` robi dalej osoba od gita.
6. Wysylka: w trybie `remote` wersja bezpieczenstwa jedzie na serwer jak kazda wersja; w `local` zostaje lokalnie.
7. Tylko wersje tego modulu (`sdd-wersja/<modul>/`); inne nazwy -> blad. Demo: bez przyciskow.
8. Napisy bez slow commit / tag / snapshot / diff. W podgladzie: "było w wersji" (-) i "jest teraz" (+).

## Zakres
- `repo-copy.js`:
  - `versionDiff(dir, tag)` -> `{ ok, files: [{ file, status: 'changed'|'added'|'removed', adds, dels, patch, binary }], truncated,
    news: { base: { kind: 'version'|'copy'|'none', name }, files, truncated } }` (`files` = od wersji do dzis,
    `news` = co nowego w tej wersji)
    (`file` wzgledem `requirements/`; `added` = jest teraz, nie bylo w wersji; patch najwyzej 60 KB na plik i 300 KB
    razem, reszta `truncated`).
  - `restoreVersion(dir, tag, o)` -> `{ ok, before: { tag, name }, restored, removed }` albo `{ ok: false, error }`.
  - `createCopier`: `diff(tag)`, `restore(tag)` w tej samej kolejce co kopie (bez wyscigu z kopia automatyczna).
- Serwer: `GET /api/copy/diff?tag=`, `POST /api/copy/restore {tag}` (zapis tylko z panelu, demo 403).
- Konfiguracja -> "Kopia i wersje" -> lista wersji: przy kazdej "Pokaż zmiany" (rozwija liste plikow ze statusem i
  liczba linii, klik pliku pokazuje zmiany) i "Przywróć" (potwierdzenie, potem komunikat i odswiezona lista).
- `ui.js`: `SddUI.diffHtml(res)` - czysty podglad (testowalny), `SddUI.restoreAsk(v)` - tresc potwierdzenia.

## Poza zakresem
Przywracanie pojedynczego pliku, porownanie dwoch wersji miedzy soba, usuwanie wersji, cofanie z `main`.

## Kryteria akceptacji
- **AC-VR1** `versionDiff`: zmieniony, dodany po wersji (takze nieśledzony) i usuniety plik z poprawnym statusem,
  `adds`/`dels`; bez zmian -> `files: []`; plik binarny -> `binary: true` bez patcha; obca nazwa wersji -> blad.
- **AC-VR2** `restoreVersion`: pliki `requirements/` jak w wersji (zmienione wracaja, dodane po wersji usuniete,
  usuniete wracaja); `HEAD`, indeks (`git diff --cached` pusty) i pliki poza `requirements/` bez zmian; powstaje wersja
  "przed przywróceniem …" z poprzednim stanem (jej przywrocenie odtwarza stan sprzed); plik > limitu i plik ignorowany
  nietkniete; obca nazwa -> blad bez zmian na dysku.
- **AC-VR3** Kopista: `diff`/`restore` w kolejce; po `restore` status odswiezony.
- **AC-VR4** Serwer: `GET /api/copy/diff?tag=` 200 z plikami, `POST /api/copy/restore` 200 i pliki na dysku jak w
  wersji, zla nazwa 409, demo 403.
- **AC-VR8** `versionDiff(...).news`: wzgledem poprzedniej wersji (`base.kind: 'version'`, nazwa) - pliki dodane i
  zmienione miedzy wersjami, bez zmian robionych po wersji; najstarsza wersja -> `kind: 'copy'` (poprzednia kopia),
  pierwsza kopia -> `kind: 'none'` i wszystkie pliki `added`. Najnowsza wersja bez zmian od zapisu: `files: []`,
  `news.files` niepuste.
- **AC-VR5** `diffHtml`: dwie czesci - "Co nowego w tej wersji" (z podpisem "w porównaniu z wersją „X”" /
  "z poprzednią kopią" / "pierwsza kopia"; statusy "zmieniony", "dodany w tej wersji", "usunięty w tej wersji";
  linie "było wcześniej" / "jest w tej wersji") i "Od tej wersji do dziś" (statusy "zmieniony", "dodany po tej
  wersji", "usunięty po tej wersji"; linie "było w wersji" / "jest teraz"; pusta -> "Od tej wersji nic się nie
  zmieniło."); liczba plikow z odmiana, linie +/- z klasami, escapowanie, dopisek przy obcieciu;
  `restoreAsk` z nazwa wersji i zdaniem o wersji bezpieczenstwa; bez slow gita.
- **AC-VR6** Konfiguracja: przyciski `data-vdiff` i `data-vrestore` przy kazdej wersji (nie w demo), potwierdzenie
  `data-vrestore-go`, wywolania `/api/copy/diff` i `/api/copy/restore`.
- **AC-VR7** (reczne) fv-manager: "Pokaż zmiany" przy "test 1" pokazuje pliki zmienione od tej wersji; "Przywróć"
  na kopii modulu (nie na prawdziwym fv-manager bez zgody).

## Weryfikacja
- 2026-10-10, testy: 8 nowych (najpierw czerwone 8/8), pelny zestaw tablicy 328 OK, 0 bledow. Po drodze dwa stare
  testy pilnowaly zasad 0.41.0: brak `-f` w repo-copy.js (zamiast `checkout-index -f` jest `git restore --worktree
  --overlay`) i brak slowa "tag" w sekcji Kopia i wersje (przyciski niosa numer wersji, obsluga poza sekcja).
- 2026-10-10, zywa tablica fv-manager po restarcie sdd-board: "Pokaż zmiany" przy "test 1" -> "1 plik różni się od tej
  wersji", `01-interview/board.json` +15 -15 z liniami +/-; przycisk "Ukryj zmiany"; "Przywróć" -> potwierdzenie
  z nazwa i godzina, "Anuluj" zamyka. Samo przywrocenie na prawdziwym fv-manager nie wykonane (bez zgody) - pokryte
  AC-VR2/VR4 na prawdziwym gicie.

- 2026-10-10, po zmianie na dwie czesci (AC-VR8, nowe AC-VR5 - najpierw czerwone 2/2): pelny zestaw 329 OK, 0 bledow.
  Zywa tablica: "test 4" (zapisana po dodaniu 2 karteczek) -> "Co nowego w tej wersji · w porównaniu z wersją „test 3”":
  `01-interview/board.json` +37 -15 z karteczkami "1" i "2"; "Od tej wersji do dziś" -> "Od tej wersji nic się nie
  zmieniło." Po drodze: `git hash-object --stdin` wieszal sie bez wejscia - puste drzewo przez tymczasowy indeks.

## Testy (TDD, przed kodem)
`board/test/version-restore.test.js` (AC-VR1..VR3, prawdziwy git), `board/test/version-restore-server.test.js`
(AC-VR4), `board/test/version-restore-ui.test.js` (AC-VR5, AC-VR6).

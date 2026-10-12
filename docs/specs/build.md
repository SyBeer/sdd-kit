# Spec: "Buduj" - autonomiczne budowanie kodu na galezi feature (zmiana 0.44.0)

Status: zlecone przez wlasciciela produktu 2026-10-12 ("dodaj gotowa instrukcje do pisania kodu aplikacji; w konfiguracji
bazowy prompt, ktory bede mogl rozbudowac; przy przycisku Zapisz ikonka buduj; budowanie na galezi feature w GIT";
potem: "budowanie musi byc w pelni autonomiczne"; decyzje: "tak, wg rekomendacji").

## Problem
Spec (PRD, R-xxx z kryteriami AC) jest gotowy w panelu, ale zeby z niego zbudowac kod, trzeba recznie uruchomic Claude
Code, napisac instrukcje (SDD + TDD, commity, CHANGELOG), zalozyc galaz i pilnowac zgod na komendy.

## Cel
Jedno klikniecie: panel zaklada galaz `feature/...` w osobnym folderze i uruchamia Claude, ktory buduje zadanie sam,
bez pytan, wg bazowego promptu modulu - a panel pokazuje postep i raport.

Metryka: zadanie z PRD zbudowane od klikniecia do raportu bez dotykania terminala i bez pytan o zgode.

## Decyzje (rekomendacja przyjeta przez wlasciciela)
1. **Autonomicznie, w granicach:** `claude -p` w tle (jak czat), `--permission-mode dontAsk`, lista dozwolonych komend
   (`BUILD_ALLOWED`) i zablokowanych (`BUILD_DENIED`). Bez `--dangerously-skip-permissions`. Komenda spoza listy jest
   odrzucana bez pytania; prompt kaze opisac brak w raporcie.
   - dozwolone: Read, Glob, Grep, Edit, Write, MultiEdit, TodoWrite, Task, Skill; testy i budowanie (`npm`, `npx`,
     `node`, `pnpm`, `yarn`, `python`, `python3`, `pytest`, `pip`, `.venv/bin/...`, `make`, `go`, `cargo`, `mvn`,
     `gradle`, `dotnet`); git: `add`, `commit`, `status`, `diff`, `log`, `show`; odczyt i pliki: `ls`, `cat`, `head`,
     `tail`, `wc`, `grep`, `find`, `mkdir`, `date`, `cd`.
   - zablokowane: `git push`, `git reset`, `git checkout`, `git switch`, `git rebase`, `git merge`, `git branch`,
     `git worktree`, `git clean`, `rm -rf`, `sudo`, `curl`, `wget`.
   - zapis plikow tylko w folderze budowania (zasada Claude Code: poza folderem roboczym zapis wymaga zgody, a w trybie
     `dontAsk` jest odrzucany).
2. **Osobny folder (git worktree) na galezi feature:** galaz `feature/<slug>` (slug z numeru i tytulu R, np.
   `feature/r-012-import-odczytow-z-csv`), folder `<repo>-build/<slug>` obok repozytorium, start z biezacego `HEAD`.
   Kopia robocza usera bez zmian (galaz, pliki, indeks). Do nowego folderu panel wklada aktualne `requirements/` z
   ostatniej kopii (0.41.0) - takze niezacommitowane - zeby Claude budowal z dzisiejszego speca. Galaz juz jest:
   ten sam folder (albo `worktree add` bez `-b`), wymagania nie sa nadpisywane - kontynuacja. Jedno budowanie na modul
   naraz.
3. **Prompt bez czekania na "tak":** niejasnosc -> najostrozniejszy wariant zapisany jako zalozenie w raporcie; gdy bez
   decyzji nie da sie isc dalej - stop z raportem. Bez push, bez zmiany galezi, bez scalania. `SDD_COPY=0` dla procesu
   budowania (hook konca sesji nie robi kopii z folderu budowania).
4. **Ikona:** mlotek z pazurem, po skosie (kontur SVG jak dyskietka; wlasciciel 2026-10-12 wybral sam mlotek - wersja
   z nawiasami `< >` i klucz ze srubokretem odrzucone, ten drugi mylilby sie z ⚙) w naglowku tuz za dyskietka, przed ⚙. Tylko modul w repo git, nie demo.
5. **Bazowy prompt w pliku modulu:** `requirements/build-prompt.md` (wersjonowany, wspolny dla zespolu). Brak pliku =
   prompt domyslny z kitu. Konfiguracja -> karta "Budowanie": pole tekstowe, "Zapisz prompt", "Przywróć domyślny"
   (usuwa plik). Pola wypelniane przez panel: `{zadanie}`, `{galaz}`, `{folder}`, `{wymagania}` (sciezka `requirements/` modulu
   wzgledem folderu budowania - modul moze lezec w podfolderze repo).

## Interfejs
- Mlotek -> okienko "Buduj": gdy nic nie buduje - lista "Co budujemy" (wymagania R z PRD, zatwierdzone na gorze, ze
  statusem) albo wlasny opis, podglad galezi, przycisk "Buduj na nowej gałęzi" (albo "Kontynuuj na gałęzi …", gdy
  galaz istnieje); gdy buduje - zadanie, galaz, czas, link "Postęp budowania" i "Zatrzymaj".
- Strona `/build` ("Budowanie"): zadanie, galaz, folder, stan (buduje / gotowe / zatrzymane / blad), przebieg na zywo
  (kroki narzedzi zwiniete jak w czacie, tekst Claude), raport koncowy (ostatnia wypowiedz Claude), "Zatrzymaj".
- Ikona mlotka pokazuje stan: kropka w kolorze `--accent` podczas budowania.

## Serwer
- `GET /api/build` -> `{ state, tasks, branch?, prompt: { custom } }`; `GET /api/build/tasks` (R z PRD).
- `POST /api/build/start { task, title }` -> przygotowanie folderu + start; `POST /api/build/stop`.
- `GET /build-events` (SSE): odtworzenie przebiegu + stan.
- `GET /api/build/prompt` -> `{ text, custom }`; `PUT /api/build/prompt { text }` / `{ reset: true }`.
- Zapis tylko z panelu (jak inne zapisy); demo 403. Stan budowania w pamieci serwera (restart serwera = koniec
  przebiegu; galaz, folder i commity zostaja).

## Kryteria akceptacji
- **AC-BD1** `build.js`: `branchFor(id, title)` (slug, `feature/`, najwyzej 50 znakow), `fillPrompt` (`{zadanie}`,
  `{galaz}`, `{folder}`), `DEFAULT_PROMPT` (SDD + TDD, autonomicznie, bez "czekasz", bez push, raport), `buildArgs`
  (`-p`, `stream-json`, `dontAsk`, `--allowedTools` z `BUILD_ALLOWED`, `--disallowedTools` z `BUILD_DENIED`, bez
  `--dangerously-skip-permissions`), `tasksFrom(prd)` (R-xxx, tytul, status; zatwierdzone pierwsze).
- **AC-BD2** `prepareWorktree` (prawdziwy git): nowa galaz w folderze obok repo; w repo usera `HEAD`, galaz, indeks
  i pliki bez zmian; w folderze budowania `requirements/` jak dzis na dysku (takze niezacommitowane i nowe pliki);
  drugie wywolanie dla tej samej galezi -> ten sam folder, wymagania nie nadpisane; obca nazwa / folder zajety -> blad.
- **AC-BD3** `BuildSession` (udawany Claude): prompt na stdin, przebieg z `parseEvent`, stan `running` / `done` /
  `stopped` / `error`, raport = ostatni tekst, `stop()`, `SDD_COPY=0` w srodowisku procesu.
- **AC-BD4** Serwer: `GET /api/build` (zadania z PRD), `POST /api/build/start` (folder + udawany Claude -> raport w
  SSE), drugie start w trakcie -> 409, `stop`, prompt `GET`/`PUT`/reset (plik `requirements/build-prompt.md`), demo 403.
- **AC-BD5** UI: mlotek `.ic.build` za `.ic.save`, przed `.cfg`, nie w demo; `buildPopHtml(state, tasks, b)` (lista
  zadan, podglad galezi, przycisk; w trakcie - Zatrzymaj i link do `/build`); Konfiguracja - karta `#budowanie`
  z `#f-bprompt`, `#bpsave`, `#bpreset`; strona `/build`.
- **AC-BD6** (reczne) fv-manager: zadanie z PRD -> folder `fv-manager-build/...`, galaz, przebieg, raport; repo usera
  bez zmian.

## Weryfikacja
- 2026-10-12, testy: `build.test.js`, `build-server.test.js`, `build-ui.test.js` (najpierw czerwone), pelny zestaw
  tablicy na zielono. Poprawka po drodze: test oczekiwal nazwy galezi 54 znakow wbrew limitowi 50 ze speca - poprawiony
  test; kod skraca nazwe do pelnego slowa.
- 2026-10-12, osobny sdd-board (port 8014) na kopii wymagan fv-manager w repo testowym, udawany Claude (bez kosztu;
  prawdziwy serwer 8012 nie byl restartowany - trwala rozmowa usera w czacie): okienko mlotka z 21 wymaganiami
  (zatwierdzone na gorze), podglad galezi `feature/r-004-import-odczytow-z-csv-caly-plik-albo`, start -> strona
  `/build`, przebieg (odczyt, polecenie, "zablokowane: git push"), raport, prompt wypelniony zadaniem, galezia
  i folderem; repo testowe na `main` bez zmian, worktree na galezi feature. Konfiguracja -> Budowanie z promptem
  domyslnym. Poprawione: `/build` w schowanej karcie czekal na polaczenie - stan pobierany od razu; prompt bez recznego
  lamania linii; mlotek przerysowany (wygladal jak siekiera). AC-BD6 (prawdziwe budowanie na fv-manager) - do
  sprawdzenia przez wlasciciela.

## Poza zakresem
Wlasne komendy w liscie dozwolonych (z Konfiguracji), kilka budowan naraz, scalanie i push z panelu, usuwanie folderow
budowania, przebieg po restarcie serwera.

## Testy (TDD, przed kodem)
`board/test/build.test.js` (AC-BD1..BD3, prawdziwy git), `board/test/build-server.test.js` (AC-BD4),
`board/test/build-ui.test.js` (AC-BD5).

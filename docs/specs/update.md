# Spec: Sprawdzanie i instalacja nowej wersji z GitHuba

Status: zatwierdzony zakres 2026-10-03 (user: "zrob sprawdzanie w sdd-kit czy jest nowa wersja, jak tak to niech sie
zaktualizuje z GitHub")
Wersja docelowa: 0.27.0

## Cel
Uzytkownik kitu dowiaduje sie o nowej wersji w panelu i aktualizuje ja jednym kliknieciem, bez terminala i bez
znajomosci komend `git` i `claude plugin`.

## Zakres
1. Sprawdzanie (`board/update.js`, serwer):
   - najnowsza wersja = `tag_name` z `GET https://api.github.com/repos/SyBeer/sdd-kit/releases/latest`
     (adres zmienia `SDD_RELEASES_URL`; `SDD_UPDATE_CHECK=0` wylacza sprawdzanie);
   - porownanie z wersja kitu na dysku (`plugin.json`); nowsza = semver wiekszy;
   - wynik pamietany 6 godzin; pierwsze sprawdzenie przy pierwszym zapytaniu z panelu; brak sieci -> cisza (bez bledu w UI).
2. Skad kit (z `~/.claude/plugins/known_marketplaces.json`, wpis `sdd-kit`):
   - `github` / `git` - Claude Code sam pobiera z GitHuba: plan = `claude plugin marketplace update sdd-kit`,
     `claude plugin update sdd@sdd-kit`;
   - `directory` z repozytorium Git (np. `~/.sdd-kit` z instalatora, repo deweloperskie) - najpierw
     `git -C <folder> pull --ff-only`, potem jak wyzej. Niezapisane zmiany w folderze -> brak aktualizacji
     i komunikat (nie nadpisujemy cudzej pracy);
   - folder, z ktorego dziala panel (np. `~/.sdd-kit` przy kicie z GitHuba), jesli jest korzeniem repo Git i rozni sie
     od zrodla - tez `git pull --ff-only` (inaczej panel zostalby na starej wersji); niezapisane zmiany -> komunikat;
     folder wewnatrz innego repo (kopia pluginu) nie liczy sie jako repo kitu;
   - `directory` bez Git (kit z ZIP-a) -> brak aktualizacji z panelu, komunikat: komenda instalatora z README;
   - brak wpisu -> komunikat, ze kit nie jest zainstalowany jako dodatek.
3. Aktualizacja (`POST /api/update`, tylko Twoj modul, `X-SDD` + Host lokalny jak inne zapisy):
   - kroki po kolei, przerwanie na pierwszym bledzie; wynik: `ok`, log komend z wyjsciem, wersja na dysku i w
     Claude Code po aktualizacji;
   - `claude`: macOS / Linux przez powloke logowania (`$SHELL -l -c`), Windows przez `cmd` (`claude.cmd` / `.exe`);
     `SDD_CLAUDE_BIN` podmienia program;
   - serwer sie nie restartuje sam (uruchomiony z terminala albo z HQAI) - po aktualizacji komunikat: zrestartuj
     sdd-board i sesje Claude Code (ostrzezenie "serwer nieaktualny" w pasku tez sie pojawi).
4. UI (`ui.js`, gorny pasek, nie w demo): przycisk "↑ <wersja>" obok numeru wersji, gdy jest nowsza; po kliknieciu
   okienko: "Dostępna wersja X (masz Y)", link "Co nowego ↗" (strona Release), przyciski "Aktualizuj" i "Później";
   gdy aktualizacja z panelu niemozliwa - powod zamiast przycisku. W trakcie: "Aktualizuję…", potem wynik
   albo blad z logiem.

## Kryteria akceptacji
- AC-UP1: `newer('0.27.0', '0.26.1')` true; `newer('0.26.0', '0.26.0')` false; `newer('0.9.0', '0.10.0')` false;
  `newer('v1.0.0', '0.99.9')` true; puste/zle -> false.
- AC-UP2: `marketSource(file)` -> `{type:'directory', path}` / `{type:'github', repo}` / `{type:'git', url}` /
  null (brak pliku, brak wpisu, zly JSON).
- AC-UP3: `updatePlan`: github -> 2 kroki claude; directory+git czysty -> `git pull --ff-only` + 2 kroki;
  directory z niezapisanymi zmianami -> `error` o niezapisanych zmianach; directory bez Git -> `error` z komenda
  instalatora; null -> `error`.
- AC-UP4: `gitState(dir)` na prawdziwym repo: `isRepo`, `clean` (plik zmieniony -> false); folder bez Git i podfolder
  innego repo -> isRepo false.
- AC-UP3b: kit z GitHuba + panel z folderu z Git -> pull tego folderu + 2 kroki claude; ten folder z niezapisanymi
  zmianami -> `error`; panel z folderu bez Git -> same kroki claude; folder panelu = zrodlo -> jeden pull.
- AC-UP5: `runPlan` na prawdziwym Git: klon z nowym commitem w zrodle -> pull przynosi commit; krok z bledem
  przerywa i zwraca `ok:false` z wyjsciem; kroki claude wolaja `SDD_CLAUDE_BIN` z argumentami.
- AC-UP6: `latestRelease(url)` z lokalnego serwera HTTP: `tag_name` bez `v` i `html_url`; blad sieci / 404 -> null;
  wynik pamietany (drugie wywolanie bez zapytania), `force` pyta ponownie.
- AC-UP7 (serwer): `GET /api/update` -> `{current, latest, newer, url, source, canUpdate, reason}`;
  `POST /api/update` bez `X-SDD` -> 403; z demo -> 403; z kitem `github` i atrapa claude -> `ok: true`, log 2 krokow.
- AC-UP8 (reczne): w panelu i na tablicy przy starszej wersji widac "↑ X", okienko z linkiem do Release,
  "Aktualizuj" konczy sie komunikatem o restarcie; przy aktualnej wersji przycisku nie ma.
- AC-UP9 (0.35.1, uwaga usera: "Przy nr wersji - jezeli jest aktualizacja - powinna pojawic sie ikona zielonej strzalki
  w dol. To samo w menu SETTINGS ... jest nowa wersja"): znaczek nowej wersji to zielone kolko ze strzalka ↓ tuz za
  numerem wersji w pasku stanu (zamiast "↑ X" w naglowku); klik otwiera to samo okienko (Co nowego, Aktualizuj / Pozniej).
  Konfiguracja, karta Serwer: przy wersji ta sama strzalka, "jest nowa wersja X", "co nowego ↗" i "Aktualizuj…"
  (otwiera okienko z paska stanu). Tylko Twoj modul (nie demo).

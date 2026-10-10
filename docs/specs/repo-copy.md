# Spec: kopia wymagan w repozytorium i zapisane wersje (zmiana 0.41.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-10: "buduj od zera jako 0.41.0 z poprawkami"; rekomendacje
przyjete: tylko `requirements/`, 00-intake bez plikow > 10 MB, galaz na komputer; "uzytkownik SDD-KIT nie wie, ze
powinien robic COMMIT" -> bezpieczenstwo bez udzialu uzytkownika, wersje przyciskiem, bez slow gita w interfejsie).

Punkt wyjscia: opis "sdd-kit 0.37.0 - kopia wymagan w repozytorium i snapshoty" z innej sesji (kodu nie ma w repo).
Ta specyfikacja go zastepuje i poprawia bledy z przegladu 2026-10-10 (patrz "Poprawki wzgledem opisu").

## Problem
Stan wymagan w toku jest tylko na dysku prowadzacego. Uzytkownik sdd-kit (analityk, biznes) zwykle nie wie, ze
powinien robic commit i push - utrata dysku albo folderu nie zostawia sladu, a zespol nie widzi pracy w toku.
Nie da sie tez nazwac waznego momentu ("wersja pokazana biznesowi 10.10").

## Cel
Praca nad wymaganiami jest kopiowana do gita automatycznie, bez wiedzy o gicie. Po wlaczeniu kopia trafia na
serwer (np. GitLab). Pasek stanu zawsze mowi, czy praca ma kopie poza tym komputerem. Wazny moment zapisujesz
przyciskiem "Zapisz wersje". Commit na `main` robi ten, kto zna gita (zwykle przy handover) - nie uzytkownik.

Metryka: modul z wlaczona wysylka - po kazdej zmianie w `requirements/` kopia na serwerze najpozniej po ~2 min ciszy;
zero commitow na galezi roboczej uzytkownika.

## Kluczowe decyzje
1. Ustawienie modulu w `SDD.yaml`: `copy: local | remote` (brak pola = `local`). Szablon: `copy: local`. Wysylke na
   serwer wlacza sie swiadomie (Konfiguracja).
2. Kopia nigdy nie zmienia `HEAD`, indeksu, plikow ani `main` - commit powstaje przez tymczasowy indeks.
3. **Drzewo kopii zawiera tylko `requirements/` modulu** (pod ta sama sciezka co w repo). Kod i niewypchniete commity
   nigdy nie wyjezdzaja. Porownanie z `main` dziala: `git diff main <galaz kopii> -- <sciezka>/requirements/`.
4. **Pliki > 10 MB pomijane** (zwykle surowe zalaczniki w 00-intake/), lista pominietych widoczna w Konfiguracji.
   Pliki z `.gitignore` pomijane. Pozostale nieśledzone pliki wchodza (kopia ma chronic tez zrodla).
5. **Galaz na komputer i modul**: `sdd-kopia/<login>/<komputer>/<modul>` - zaden push nie zablokuje sie przez prace
   z drugiego komputera i nic nie nadpisuje. Login = czesc `user.email` przed `@` (slug), bez e-maila `sdd`;
   komputer = `os.hostname()` bez domeny (slug), `SDD_COPY_HOST` nadpisuje; modul = slug sciezki modulu wzgledem
   korzenia repo, a gdy modul jest korzeniem - slug nazwy folderu. Stala glebokosc - brak konfliktu nazw refow.
6. Brak zmian w `requirements/` = brak commitu (porownanie drzewa kopii z czubkiem galezi kopii; ruch `HEAD` nie ma
   wplywu). Automatyczne kopie to commity na galezi, nie tagi.
7. Wersje (snapshoty) to tagi z adnotacja `sdd-wersja/<modul>/<RRRR-MM-DD>-<slug nazwy>` na commicie kopii - wspolne
   dla zespolu, duplikat odrzucany.
8. Wysylka bezpieczna: bez `--force`; nigdy nie pyta o haslo (`GIT_TERMINAL_PROMPT=0`, `GCM_INTERACTIVE=never`,
   `GIT_SSH_COMMAND="ssh -o BatchMode=yes"` gdy nie ustawione); limit 30 s; tylko wlasna galaz kopii i tagi
   `sdd-wersja/<modul>/` - nigdy inne tagi. Bledy jako stan, nie wyjatek. kit nie przechowuje hasel.
9. Interfejs mowi "kopia" i "wersja" - bez "commit", "galaz", "tag" (te tylko w drobnym opisie technicznym).

## Mechanizm - `plugins/sdd/board/repo-copy.js` (nowy, async, `execFile('git')`, `windowsHide`)
- `repoState(dir)` -> `{ git, root, rel, branch, origin, login, host, module, copyBranch }`; bez gita `{ git: false }`.
- `makeCopy(dir, { maxBytes })` -> `{ changed, commit, skipped }`: tymczasowy indeks (`GIT_INDEX_FILE` w `os.tmpdir()`),
  `read-tree --empty`, `add -A -- <rel>/requirements`, usuniecie z indeksu plikow > `maxBytes` (domyslnie 10 MB),
  `write-tree`; drzewo rowne drzewu czubka -> bez commitu; inaczej `commit-tree [-p czubek]` z autorem z gita albo
  `sdd-kit <sdd-kit@localhost>`, `update-ref` z poprzednia wartoscia (wyscig -> jedna ponowna proba); `finally` usuwa
  indeks.
- `pushCopy(dir)` -> `{ ok, error }`: jeden `git push origin` z galezia kopii i niewyslanymi tagami modulu; po sukcesie
  ukryte refy `refs/sdd-sent/heads/<galaz>` (wyslany czubek) i `refs/sdd-sent/tags/<tag>` - stan przetrwa restart.
  Blad: ostatnie linie stderr bez `hint:`, max 300 znakow.
- `copyStatus(dir, mode, lastError)` -> `{ state, at, branch, origin, error }`, `state`:
  `nogit` (modul nie jest repo), `local` (tryb lokalny), `noorigin` (tryb remote bez adresu serwera),
  `ok` (wyslany czubek = czubek, brak bledu i niewyslanych tagow), `unsent` (pozostale), `at` = data czubka kopii.
- `slug(name)`: male litery, `ł`->`l`, bez diakrytykow, poza `[a-z0-9]` -> `-`, przyciete, max 40 znakow.
- `makeVersion(dir, name, { push, now })` -> `{ ok, tag, sent, error }`; `listVersions(dir)` -> `[{ tag, name, at, sent }]`
  od najnowszej.
- `copyOnce(dir, mode, lastError)` - kopia, a w trybie remote z adresem: wysylka, gdy kopia sie zmienila albo stan nie `ok`.
  Nigdy nie rzuca.
- `createCopier(dir, { delayMs, mode, onChange })` -> `touch()` (debounce), `now()` (od razu; w trakcie - laczy w jedno
  nastepne przejscie), `version(name)` (ta sama kolejka), `status()`, `idle()`, `stop()`; po kazdym przejsciu `onChange`.

## Wyzwalacze
1. Zmiana pliku w `requirements/` (istniejacy `fs.watch`) -> `touch()`, kopia po 2 min ciszy (`SDD_COPY_DELAY_MS`).
2. Start serwera albo wybor modulu -> `now()`.
3. Koniec sesji Claude Code (hook `SessionEnd`, `session-mark.js end`): gdy `cwd` ma `requirements/SDD.yaml` -
   `copyOnce`; hook czeka, nic nie wypisuje, zawsze kod 0. Windows: zamkniecie okna nie odpala hooka - dzialaja 1 i 2.
4. Recznie: "Zrob kopie teraz" (`POST /api/copy/now`).
5. Zapis `copy` w Konfiguracji -> `now()` (wlaczenie wysylki od razu wysyla).
`SDD_COPY=0` wylacza kopiste w serwerze (testy, awaria).

## Serwer
- Kontekst modulu: `copier`, `copy`; `setupCopy` w `selectModule` (tylko Twoj modul; demo bez kopii, `copy: null`).
- Stan liczony po zdarzeniu (onChange, `GET /api/copy`), rozsylany w SSE: `progressPayload.copy`, `boardView._copy`
  (`_copy` w `VIEW_ONLY`, nie trafia do `board.json`).
- API: `GET /api/copy` -> `{ mode, repo, status, versions, skipped }`; `POST /api/copy/now`; `POST /api/copy/version {name}`
  -> 200 albo 409 `{error}`; bez modulu 409; demo 403.
- `PUT /api/config` przyjmuje `copy` (`info.yamlSet`: brak linii - wstawiona pod `backlog:` z komentarzem), `GET` zwraca
  `sdd.copy`.

## Interfejs
- Pasek stanu (trzy strony): `SddUI.copyLive(copy, base, now)` -> `{ cls, html }`, `SddUI.showCopy(copy)` dopisuje `#copy`
  za `#conn`:

| Stan | Kropka | Napis |
|---|---|---|
| `copy` null (demo / brak modulu) | jak dotad | bez dopisku |
| `ok` | zielona | `· kopia 14:32` (inny dzien `10.10 14:32`) |
| `local` | szara | `· kopia tylko na tym komputerze` (z godzina, gdy jest) |
| `nogit` / `noorigin` / `unsent` | zolta | `· brak kopii` / `· kopia niewysłana` + podpowiedz z przyczyna |
| brak polaczenia | czerwona | dopisek ukryty |

  Napisy przy zoltej i szarej kropce to link do `<base>/config#kopia`. Tokeny `--warn`, `--idle` w trzech blokach motywu.
- Konfiguracja -> sekcja "Kopia i wersje" (`id="kopia"`, pod "Ustawienia modulu", tresc z `GET /api/copy`):
  gdzie jest kopia (folder; serwer albo "brak adresu serwera"), przelacznik `#f-copy` "Wysyłaj kopię na serwer"
  (zapis od razu; nieaktywny bez gita / adresu / w demo, z podpowiedzia), "Ostatnia kopia" (czas, stan, blad,
  `#copynow`), pominiete duze pliki, "Wersje" (`#verlist`, `#f-ver`, `#versave`, Enter zapisuje). Sekcja nie oznacza
  formularza SDD.yaml jako zmienionego. `#kopia` w adresie przewija do sekcji.
- "Jak to dziala": sekcja "Kopia i wersje" - po co, ustawienie, kiedy, wersje, pasek stanu, logowanie, przeniesienie
  na `main` (`git checkout <tag> -- <sciezka>/requirements/` + commit) i porownanie.

## Niezmienniki
- Kopia nie zmienia `HEAD`, `main`, indeksu ani plikow roboczych.
- W drzewie kopii tylko `requirements/` modulu.
- Brak zmian w `requirements/` = brak commitu (takze po commicie kodu na `main`).
- Zadnego `--force`, pytan o haslo; limit 30 s; wysylka tylko galezi kopii i tagow `sdd-wersja/<modul>/`.
- Bledy gita nie wywracaja serwera ani hooka.
- Demo tylko do odczytu, bez kopii; `_copy` nie trafia do `board.json`.

## Kryteria akceptacji
- **AC-RC1** `repoState`: korzen, sciezka wzgledna, galaz, origin, login (slug, bez e-maila `sdd`), komputer,
  `copyBranch = sdd-kopia/<login>/<komputer>/<modul>`; katalog bez gita -> `git: false`.
- **AC-RC2** `makeCopy`: w drzewie tylko `<rel>/requirements/` (z plikami nieśledzonymi, bez `.gitignore`); HEAD,
  indeks i `git status` bez zmian; drugi raz bez zmian -> `changed: false`; nowy commit ma rodzica = poprzednia kopia;
  repo bez commitow dziala; commit kodu na `main` nie tworzy nowej kopii.
- **AC-RC3** Plik > `maxBytes` pominiety i zwrocony w `skipped`.
- **AC-RC4** Dwa moduly w jednym repo maja osobne galezie; kopia jednego nie zmienia kopii drugiego.
- **AC-RC5** `pushCopy`: sukces na lokalnym "origin" (bare), brak `origin` -> czytelny blad, nieosiagalny serwer ->
  blad bez wyjatku; srodowisko bez pytan (w tym `GIT_SSH_COMMAND` z `BatchMode`), bez `--force`; obce tagi nie wysylane.
- **AC-RC6** `copyStatus`: `nogit`, `local`, `noorigin`, `ok`, `unsent` (blad, niewyslany czubek, niewyslana wersja).
- **AC-RC7** `slug`; `makeVersion` (tag z data i slugiem, pusty slug / duplikat -> blad, wysylka przy `push`),
  `listVersions` od najnowszej z `sent`.
- **AC-RC8** `createCopier`: debounce `touch`, `now` w trakcie laczy sie w jedno przejscie, kolejka sekwencyjna,
  `onChange`; tryb `local` nie wysyla; blad wysylki -> `unsent` z przyczyna.
- **AC-RC9** Hook `session-mark.js end` w module z gitem robi kopie (i wysyla w trybie remote), poza modulem nic; kod 0.
- **AC-RC10** Serwer end-to-end: `GET /api/copy`, `POST /api/copy/now` (kopia na lokalnym origin), `POST /api/copy/version`
  (200, duplikat 409), `PUT /api/config {copy}`, demo 403, `_copy` w SSE tablicy i nie w `board.json`.
- **AC-RC11** `info.js`: `COPIES`, `yamlSet({copy})` (wstawienie pod `backlog:` / podmiana), `copyMode(yaml)`; szablon
  `copy: local`; przewodnik "Kopia i wersje".
- **AC-RC12** UI: `copyLive` dla kazdego stanu, `--warn`/`--idle` w trzech blokach, `showCopy` na trzech stronach,
  sekcja `#kopia` z `#f-copy`, `#copynow`, `#verlist`, `#f-ver`, `#versave`; bez slow "commit"/"tag" w napisach sekcji.
- **AC-RC13** (reczne) prawdziwy GitLab: wlaczenie wysylki, galaz `sdd-kopia/...` na serwerze, wersja jako tag.
  Wymaga zgody wlasciciela produktu (wypycha do firmowego repo).

## Weryfikacja
- 2026-10-10, testy: 12 kryteriow AC-RC1..AC-RC12 na prawdziwym gicie (zielone), pelny zestaw sdd-kit bez bledow.
- 2026-10-10, panel na kopii modulu demo w repo git z lokalnym "serwerem" (`git init --bare`): przy starcie szara
  "kopia tylko na tym komputerze 09:53"; "Wysyłaj kopię na serwer" -> `copy: remote` w SDD.yaml, zielona "kopia 09:53",
  galaz `sdd-kopia/tomek/sybm5/gmod` na serwerze; "Zapisz wersję" -> tag `sdd-wersja/gmod/2026-10-10-pokazane-biznesowi-10-10`
  na serwerze, na liscie "na serwerze"; `main` bez nowego commitu; serwer nieosiagalny -> zolta "kopia niewysłana"
  z przyczyna w podpowiedzi. AC-RC13 (prawdziwy GitLab) - czeka na zgode.

## Poprawki wzgledem opisu z innej sesji
1. Galaz na komputer i modul (byla jedna na login - Mac + Windows blokowaly sie nawzajem bez `--force`).
2. Drzewo tylko `requirements/` (bylo `HEAD` + requirements - wypychalo niewypchniety kod).
3. Brak commitu przy ruchu `HEAD` (porownanie calego drzewa lamalo niezmiennik).
4. Dwa moduly w jednym repo - osobne galezie (wczesniej kopia B cofala wymagania A).
5. `GIT_SSH_COMMAND` z `BatchMode` (SSH mogl pytac o haslo klucza / host).
6. Ponowienie `update-ref` przy wyscigu hook / serwer.
7. Tylko tagi `sdd-wersja/<modul>/` w wysylce.
8. Tryb `local` = szara kropka "kopia tylko na tym komputerze", nie zolte "brak kopii".
9. Pliki > 10 MB pomijane, z lista.
10. Jezyk interfejsu bez gita ("wersja", nie "snapshot").

## Poza zakresem 0.41.0
Przywracanie wersji i porownanie w panelu, usuwanie kopii i wersji, zakladanie repo i `origin` z panelu, scalanie
kopii z `main`, propozycja commita / merge requesta w `/sdd:handover`.

## Testy (TDD, przed kodem)
`board/test/repo-copy.test.js` (AC-RC1..AC-RC9, prawdziwy git w katalogach tymczasowych, origin = `git init --bare`,
`GIT_CONFIG_GLOBAL` pusty, `GIT_CONFIG_NOSYSTEM=1`), `board/test/repo-copy-server.test.js` (AC-RC10),
`board/test/repo-copy-ui.test.js` (AC-RC11, AC-RC12).

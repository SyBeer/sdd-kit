---
name: board
description: Lokalna tablica warsztatowa (karteczki jak w Event Stormingu) odswiezana na zywo w przegladarce, bez Miro. Agent stawia karteczki piszac do requirements/01-interview/board.json, po warsztacie synchronizuje tablice do plikow. Uzyj, gdy user mowi "tablica", "board", "warsztat na zywo", "pokaz na karteczkach", "event storming", "rozpisz procesy aplikacji na tablicy", albo podczas /sdd:interview live.
---

# /sdd:board

Tablica to WIDOK. Pliki w `requirements/` sa PRAWDA. Nigdy odwrotnie.

## Uruchomienie (`/sdd:board start`)
1. Powiedz userowi, zeby w osobnym oknie terminala, w folderze projektu, uruchomil `sdd-board`
   (komenda z instalatora) albo pelna forme:
   `node "${CLAUDE_PLUGIN_ROOT}/board/server.js" requirements/01-interview/board.json`
   i otworzyl w przegladarce http://localhost:8012/board (pod / jest widok postepu; port mozna zmienic drugim argumentem).
   Ty nie uruchamiasz serwera w tle sam, chyba ze user o to poprosi.
2. Jesli `board.json` nie istnieje, utworz go: tytul z `SDD.yaml`, pasy = procesy znane z intake (jesli zadnych, jeden pas "Proces glowny"), `notes: []`.
3. Przyklad gotowej tablicy do nauki: `${CLAUDE_PLUGIN_ROOT}/board/example-zlecenia.json`.

## Format board.json
```json
{ "title": "...", "subtitle": "...", "lanes": ["Pas 1", "Pas 2"],
  "notes": [ { "id": "n01", "type": "ev|cmd|act|pol|rm|hot|space", "text": "...", "lane": "Pas 1",
               "col": 0, "ref": "R-04", "source": "czat Base44, TZ, 2026-09-10 [Biz]",
               "file": "03-spec/PRD.md", "by": "agent",
               "created": "2026-09-26T17:40:00+02:00", "updated": "2026-09-26T17:40:00+02:00" } ] }
```
Typy: `ev` zdarzenie (cos sie stalo), `cmd` komenda (ktos cos robi), `act` kto (rola), `pol` regula (jezeli... to...), `rm` widok (co ktos oglada), `hot` nie wiemy (pytanie),
`space` odstep - puste miejsce oddzielajace elementy na tablicy (tresc nieobowiazkowa); to uklad, nie wymaganie.
`created` / `updated`: data i czas ISO 8601 z czasem lokalnym (`date -Iseconds`). Nowa karteczka: oba pola = teraz. Zmiana tresci, typu, pasa, `ref` albo przeniesienie w inne miejsce: `updated` = teraz, `created` bez zmian.
Samo przenumerowanie kolumn (wstawienie albo zamkniecie kolumny w pasie) nie zmienia `updated`. Panel pokazuje je jako RRRR-MM-DD HH:MM.
`answer`, `answeredBy`, `answeredAt` (tylko `hot`): odpowiedz biznesu wpisana na tablicy, kto odpowiedzial (rola), kiedy.
Tablica tylko zbiera odpowiedzi - do plikow wpisuje je agent przy `sync` (krok 3 ponizej).
`col` to kolejnosc w pasie od lewej (0,1,2...). Karteczki z tym samym `col` stoja jedna pod druga (np. zdarzenie i jego hotspot).

## Tura warsztatu (`/sdd:board` podczas rozmowy)
Po KAZDEJ wypowiedzi usera:
1. Wyciagnij fakty: kto, co robi, co sie dzieje, jaka regula, co oglada.
2. Dopisz karteczki do `board.json` (edytuj plik, zachowaj istniejace). Kazda z `source` (kto powiedzial, data, [Biz]) i `file` (gdzie trafi po warsztacie). `by: "agent"`.
3. Luka, puste "dlaczego", sprzecznosc ze znanym zrodlem -> czerwona `hot` obok karteczki, ktorej dotyczy (ten sam `lane` i `col`). Tresc = pytanie, `ref` = nastepny wolny Q-xxx (sprawdz QUESTIONS.md).
4. Odpowiedz tekstem KROTKO: co postawiles (jedno zdanie) i jedno pytanie doprecyzowujace. Pytaj o przeszlosc, nie o hipotezy.
5. Pomylka w interpretacji: popraw lub usun karteczke, nie dopisuj obok.

Piszesz do board.json sam, bez pytania (odtwarzalne).
User tez edytuje tablice w przegladarce: zaklada procesy (pasy), zmienia ich nazwy i kolejnosc, dopisuje karteczki.
Zawsze czytaj aktualny `board.json` tuz przed edycja i nie przywracaj starych nazw procesow ani usunietych karteczek.

## Synchronizacja po warsztacie (`/sdd:board sync`)
1. Przeczytaj `board.json`. Karteczki z `by: "czlowiek"` lub zmienione recznie (brak `by`, `source` zaczynajace sie od "warsztat, dopisane w przegladarce") to slowa biznesu `[Biz]` o najwyzszej wiarygodnosci.
2. Pomin karteczki `space` (odstepy) - nie trafiaja do plikow i nie dostaja `synced`.
   **Odpowiedzi z tablicy najpierw**: karteczki `hot` z `answer`, ktorych pytanie w `QUESTIONS.md` jest dalej otwarte,
   zadane albo sprzeczne (albo pytania nie ma w pliku - wtedy najpierw zaloz Q). Kazda przetwarzasz jak `/sdd:interview`
   krok 3: 3-5 linijek - decyzja D czy potwierdzenie/obalenie A czy nowe Q, tresc, kaskada (R, AC, A, BR); autor =
   `answeredBy` (bez autora - zapytaj, kto odpowiedzial); czekasz na "tak". Po "tak": wpis do DECISIONS/ASSUMPTIONS,
   Q -> `odpowiedziane` + "Zamkniete przez", dotkniete R do sekcji 6 PRD, linia w CHANGELOG. `answer` zostaje na
   karteczce (slad); tablica sama pokaze ja szara z "zamknięte: D-xxx".
   Zaproponuj mapowanie (i PYTAJ przed zapisem, 3-5 linijek na paczke):
   - `hot` -> wiersze w `QUESTIONS.md` (status `otwarte`, "Skad" = warsztat + data)
   - `act` -> `ACTORS.md`
   - `ev` -> stany w `ENTITIES.md`
   - `pol` -> `RULES.md` jako BR-xxx (+ A niepotwierdzone, jesli zrodlo nie [Biz])
   - `cmd`, `rm` -> kandydaci R do `PRD.md` (sekcja robocza) albo notatka w `session-YYYY-MM-DD.md`
3. Wpisz `ref` z powrotem do karteczek, zeby tablica i pliki mialy te same numery.
   Kazdej karteczce przeniesionej do plikow ustaw `synced` = teraz (ISO, `date -Iseconds`) i `file` = plik, do ktorego trafila.
   Nie zmieniaj przy tym `updated`. Panel pokazuje wtedy ✓; jesli `ref` nie ma w `file` - ! (popraw plik albo ref).
4. Pytania w druga strone: otwarte, zadane i sprzeczne Q z `QUESTIONS.md`, ktorych nie ma na tablicy (zadna karteczka
   nie ma `ref` = Q-xxx), dopisz jako `hot` wg zasad miejsca ponizej - albo powiedz userowi, ze tablica pokazuje je
   w pasku "Pytania" z przyciskiem "Dołóż". Pytan zamknietych w pliku nie usuwaj sam: tablica pokazuje je szare
   z "zamknięte: D-xxx", user zdejmuje je przyciskiem "Zdejmij zamknięte".
5. `CHANGELOG.md` + 5 linijek podsumowania.

## Odtworzenie tablicy z plikow (`/sdd:board rebuild`)
Zbuduj `board.json` od zera z ACTORS, ENTITIES, RULES, QUESTIONS. Uzywaj, gdy pliki sa dalej niz tablica.
Pytania: kazde otwarte, zadane i sprzeczne Q staje sie karteczka `hot` (`ref` = Q-xxx, tresc = pytanie,
`file` = `01-interview/QUESTIONS.md`, `synced` = teraz). Odpowiedziane i zaparkowane - nie.

## Procesy z dzialajacej aplikacji (`/sdd:board processes`)
Rozpisuje procesy istniejacej aplikacji (as-built) na karteczki - punkt wyjscia do warsztatu "jak to dziala dzis".
Zapis tylko do `board.json` (odtwarzalne, bez pytania). Nie tworzysz R, BR, D ani Q w plikach - to robi `sync`.
1. Czytaj: aktualny `board.json`, `00-intake/INDEX.md` (zrodla `as-built`, zwlaszcza odczyt kodu `[App]`),
   `DECISIONS.md`, `RULES.md`, `QUESTIONS.md`, sekcje "Poza zakresem" i kandydatow w PRD.
2. Czytaj aplikacje: punkty wejscia (trasy, ekrany, formularze, komendy CLI), logike obliczen i walidacji, integracje,
   README. Kod czytasz fragmentami (grep po trasach i funkcjach), nie calymi plikami.
3. Pasy = procesy tak, jak je widzi uzytkownik (cel: "Miesieczny odczyt", "Rozliczenie miesiaca"), nie pliki ani
   endpointy. Zwykle 5-9 pasow. Pasy i karteczki usera zostaja; pusty pas domyslny ("Nowy proces") mozna usunac;
   `Do wyjaśnienia` na koncu `lanes`.
4. W pasie od lewej wg przebiegu: `act` (kto) -> `cmd` (co robi) -> `pol` (regula/walidacja) -> `ev` (co sie stalo)
   -> `rm` (co oglada). Kazda karteczka w swojej kolumnie. Tresc jezykiem biznesu ("Wpisz cene paliwa recznie"),
   nie nazwa trasy; regula w formie "Jezeli ..., to ...".
5. `source` = `[App] <plik>:<linia>` albo `[App]/[Dok] <plik z INDEX.md>, sekcja`. Gdy jest decyzja `[Biz]`
   (D-xxx), dopisz ja na poczatku - wygrywa z kodem. `ref` = BR-xxx, jesli karteczka to istniejaca regula.
   `file` = docelowy plik wg mapowania z `sync` (act -> ACTORS, ev -> ENTITIES, pol -> RULES, cmd/rm -> PRD).
6. Decyzja mowi co innego niz kod -> karteczka opisuje stan docelowy z dopiskiem "(docelowo; dzis ...)".
   Funkcje oznaczone w PRD jako poza zakresem (makiety itp.) pomijasz.
7. Rozjazd kod vs dokumentacja, funkcja opisana, a nieobecna w kodzie, zachowanie bez zrodla `[Biz]` budzace
   watpliwosc -> `hot` przy karteczce, ktorej dotyczy (zasady miejsca ponizej), `ref` = kolejne wolne Q-xxx
   z QUESTIONS.md. Pytanie o przeszlosc ("kiedy ostatnio..., jak to zrobiles?"). Najwyzej kilka - reszta przy `sync`.
8. Nie dubluj: karteczka o tym samym `ref` albo tej samej tresci w pasie juz jest -> pomijasz.
   `id` unikalne, `by: "agent"`, `created` = `updated` = teraz (`date -Iseconds`). Tytul/podtytul tablicy:
   nazwa aplikacji + wersja + "as-built", jesli byly domyslne.
9. Linia w `CHANGELOG.md` (liczba procesow, karteczek, numery Q) i odpowiedz: lista pasow po 1 zdaniu,
   co oznaczyles "docelowo", jakie `hot`, jedno pytanie o przeszlosc.

## Gdzie stawiac pytanie (`hot`)
1. Powiazane ID pytania to R/BR/D/A z kolumn "Skad" i "Wplyw" w QUESTIONS.md.
2. Pierwsza karteczka (nie `hot`), ktorej `ref` jest wsrod tych ID -> ten sam `lane` i `col`, na koncu kolumny.
3. Brak takiej karteczki -> proces `Do wyjaśnienia` na koncu `lanes` (zaloz, jesli go nie ma), kolejna wolna kolumna.
   Tablica pokazuje nazwe tego procesu na czerwono. Tak samo liczy przycisk "Dołóż" na tablicy (`placeQuestions`).

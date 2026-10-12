# Spec: polecenia dla Claude na pasku Tablicy + "Uporządkuj tablicę" (zmiana 0.43.0)

Status: zlecone przez wlasciciela produktu 2026-10-10 ("na tablicy w menu, gdzie jest dodawanie karteczek, zrob cos, co
pozwoli wybrac odpowiednia komende dla Claude, zeby zrobic porzadek z tablica"; potem: "po prawej. Wszystkie komendy -
moga byc z listy wyboru").

## Problem
Polecenia porzadkowe tablicy (`/sdd:board sync`, `rebuild`, `processes`) trzeba znac na pamiec i wpisac w Claude Code.
Tablica tylko kopiuje `/sdd:board sync` do schowka. Nie ma polecenia, ktore sprzata sama tablice (duplikaty, karteczki
w zlym procesie, dziury w kolumnach).

## Cel
Z paska Tablicy wybrac polecenie z listy - trafia do okna Claude gotowe do wyslania.

Metryka: polecenia tablicy uruchamiane z listy, bez wpisywania i bez kopiowania.

## Decyzje
1. Lista wyboru po **prawej** stronie paska Tablicy (`.tbar`), za PDF i widokiem: "Claude: porządek…" + opcje:
   - "Przenieś karteczki do plików" -> `/sdd:board sync`
   - "Uporządkuj tablicę" -> `/sdd:board tidy` (nowe)
   - "Odtwórz tablicę z plików" -> `/sdd:board rebuild`
   - "Procesy z działającej aplikacji" -> `/sdd:board processes`
   Kazda opcja ma podpowiedz (title) jednym zdaniem, co robi, a na koncu etykiety nazwe polecenia w nawiasie
   kwadratowym: "Przenieś karteczki do plików [sync]", "… [tidy]", "… [rebuild]", "… [processes]" (uwaga wlasciciela 2026-10-10).
2. Po wyborze (domyslnie - user nie wybral innego wariantu) polecenie trafia tam, gdzie juz trwa rozmowa, nigdy jej
   nie przerywa:
   - rozmowa dziala w **czacie** -> okno w widoku czat, polecenie w polu wiadomosci zaznaczone (Enter wysyla, mozna
     dopisac szczegoly);
   - rozmowa dziala w **terminalu** -> okno w widoku terminal, polecenie wpisane w terminal bez Enter (poprawka przed
     wydaniem: pierwsza wersja przelaczala na czat i uruchamiala tam rozmowe, co przerwaloby sesje w terminalu);
   - Claude nie dziala w module -> panel uruchamia czat (wznowienie zapisanej rozmowy, jak przycisk "Uruchom"),
     polecenie czeka i trafia w pole, gdy rozmowa ruszy.
   Lista wraca do "Claude: porządek…".
3. "Odtwórz tablicę z plików" buduje tablice od nowa - przed wstawieniem polecenia panel sam zapisuje wersje
   "przed odtworzeniem tablicy GG:MM" (blad zapisu nie blokuje, komunikat w pasku). Skill przed nadpisaniem pokazuje,
   co zniknie (karteczki tylko na tablicy), i czeka na "tak".
4. Demo (tylko do odczytu) i okno eksportu PDF: listy nie ma. Bez okna Claude (serwer bez czatu) - komunikat.
5. `/sdd:board tidy` - nowe polecenie skilla, tylko `board.json`:
   - znajduje: duplikaty (ta sama tresc albo `ref` w procesie), karteczki w zlym procesie (tresc o innym procesie),
     kolejnosc w pasie niezgodna z przebiegiem (`act` -> `cmd` -> `pol` -> `ev` -> `rm`), dziury i nakladanie w
     kolumnach, puste procesy, pytania `hot` odpowiedziane w plikach (zamkniete) do zdjecia, karteczki bez procesu;
   - **najpierw propozycja** (lista zmian po 1 zdaniu, pogrupowana), zmiany dopiero po "tak" (mozna "tak, bez 3");
   - nie usuwa karteczek usera (`by: "człowiek"`) bez wyraznej zgody na konkretna karteczke; nie zmienia tresci, tylko
     miejsce (proces, kolumna) - poprawke tresci proponuje jako pytanie; nie tworzy R/BR/D/Q w plikach (to `sync`);
   - `updated` = teraz przy przeniesionych karteczkach; linia w `CHANGELOG.md`; podsumowanie 3-5 linijek.

## Kryteria akceptacji
- **AC-BC1** `SddUI.boardCmds()` - 4 polecenia w tej kolejnosci: `{ id, label, cmd, title }` jak w Decyzjach 1.
- **AC-BC2** `index.html`: lista `#claudecmd` w `.tbar` za `#pdf` (po prawej, `margin-left:auto`), pierwsza opcja
  "Claude: porządek…", opcje z `SddUI.boardCmds()`; ukryta w demo i w oknie PDF; wybor -> `SddUI.claudeAsk(cmd)`,
  potem lista wraca do pierwszej opcji; `rebuild` -> najpierw `POST /api/copy/version` "przed odtworzeniem tablicy".
- **AC-BC3** `ui.js` `claudeAsk(text)`: sprawdza stan (`/api/chat`, `/api/term`); czat dziala albo nic nie dziala ->
  widok czat, tekst w `.cd-input` z klasa `hinted` (zaznaczony, Enter wysyla), fokus; nic nie dziala -> start czatu
  (wznowienie, gdy jest zapisana) i tekst czeka do `running`; terminal dziala (czat nie) -> widok terminal i tekst przez
  `/api/term/input` bez znaku Enter; brak okna (demo, node) -> `false`.
- **AC-BC4** `skills/board/SKILL.md`: sekcja `/sdd:board tidy` z zasadami z Decyzji 5 (propozycja przed zmiana, nie
  usuwa karteczek usera bez zgody, tylko `board.json`, nie zmienia tresci); `rebuild` - krok "pokaz, co zniknie, czekaj
  na tak"; opis skilla wymienia `tidy` / "uporzadkuj tablice".
- **AC-BC5** (reczne) fv-manager: wybor "Uporządkuj tablicę" -> okno Claude z `/sdd:board tidy` w polu; Enter ->
  propozycja zmian bez zapisu; "Odtwórz…" -> nowa wersja "przed odtworzeniem tablicy" na liscie wersji.

## Weryfikacja
- 2026-10-10, testy: `board-commands.test.js` 4/4 (najpierw czerwone), pelny zestaw tablicy 342 OK, skrypty 6 OK.
- 2026-10-10, zywa Tablica (fv-manager): lista po prawej stronie paska z 4 poleceniami. Kierowanie sprawdzone na
  podstawionych odpowiedziach serwera (bez dotykania sesji usera, ktora dzialala w terminalu): terminal dziala ->
  widok terminal, `/sdd:board tidy` do `/api/term/input` bez Enter; czat dziala -> `/sdd:board sync` zaznaczone w polu;
  nic nie dziala -> `/api/chat/start {resume:true}`. AC-BC5 (prawdziwe `tidy` i wersja przed `rebuild`) - do
  sprawdzenia przez wlasciciela.

## Poza zakresem
Wysylanie bez Enter, polecenia spoza `/sdd:board`, wlasne polecenia usera w liscie.

## Testy (TDD, przed kodem)
`board/test/board-commands.test.js` (AC-BC1..BC4).

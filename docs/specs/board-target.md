# Spec: procesy docelowe na Tablicy - widok "dzis / docelowo / oba" (zmiana 0.36.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-06: makieta na demo przyjeta - "tak, buduj jako 0.36.0,
PDF z wybranym widokiem").

## Problem
`/sdd:board processes` rozpisuje tylko to, co aplikacja robi dzis (as-built). Wymagania, ktorych jeszcze nie
zbudowano, trafiaja co najwyzej jako czerwone pytania - na tablicy nie widac nowych procesow ani nowych krokow
w istniejacych procesach, wiec warsztat "jak ma byc" nie ma na czym pracowac.

## Cel
Na jednej tablicy widac i stan dzisiejszy, i docelowy - wyraznie rozroznione; jednym przelacznikiem pokazujesz
sam stan dzisiejszy, sam zakres do zbudowania albo oba.

Metryka: na warsztacie "jak ma byc" prowadzacy przelacza widok zamiast prowadzic dwie tablice.

## Jak
- Karteczka docelowa = karteczka z polem `target: true` w `board.json` (stare tablice bez zmian - brak pola = dzis).
- Proces docelowy = proces, ktorego wszystkie karteczki (bez odstepow) sa docelowe - bez osobnego pola w `lanes`.
- `/sdd:board processes` dokłada procesy i kroki docelowe z wymagan R, ktorych nie ma w kodzie.

## Zakres
- Karteczka docelowa: przerywana obwodka, etykieta `DOCELOWO` nad trescia, w podpowiedzi "docelowo - jeszcze nie ma
  w aplikacji"; kolor typu bez zmian.
- Proces docelowy: znacznik `DOCELOWO` pod nazwa procesu i lekko kreskowane tlo pasa.
- Przelacznik widoku w pasku narzedzi "widok: dziś / docelowo / oba" (domyslnie "oba"), zapamietany w przegladarce:
  - **dziś** - karteczki i procesy docelowe ukryte,
  - **docelowo** - docelowe w pelnych kolorach, reszta przygaszona,
  - **oba** - wszystko.
  Przelacznik widac tylko, gdy na tablicy jest choc jedna karteczka docelowa.
- Pasek stanu: "N docelowo" (gdy N > 0).
- Panel karteczki: pole "docelowo - jeszcze nie ma w aplikacji" (zaznaczenie), zapis jak pozostale pola; w demo
  tylko do czytania. Duplikat karteczki docelowej jest docelowy.
- PDF (docs/specs/board-pdf.md): eksport z wybranym widokiem; w naglowku PDF "widok: …", gdy na tablicy sa docelowe.
- Skill `board`: `processes` dokłada docelowe (zrodlo `[Biz] PRD R-xxx`, `target: true`); `sync` traktuje karteczki
  docelowe jak wymagania do zbudowania (R / AC), nie jak opis dzisiejszego dzialania; `rebuild` - bez zmian.
- "Jak to dziala" (sekcja Tablica warsztatowa): zdanie o widokach.

## Poza zakresem
- osobne pole procesu w `lanes` (proces docelowy wynika z karteczek),
- automatyczne przelaczanie karteczki z "docelowo" na "dzis" po wdrozeniu - robi to czlowiek albo `processes`.

## Kryteria akceptacji
- **AC-BT1** `board-ops.js`: `isTarget(n)` (`target === true`), `targetLane(b, lane)` (ma karteczki bez odstepow
  i wszystkie docelowe), `countTarget(b)` (docelowe bez odstepow), `VIEWS = ['dzis','docelowo','oba']`,
  `viewOf(stored)` - zapisany widok albo "oba".
- **AC-BT2** `copyNote` przenosi `target`; `stampNotes` uznaje zmiane `target` za zmiane karteczki (aktualizuje `updated`).
- **AC-BT3** Tablica: karteczka docelowa ma klase `target` i etykiete `DOCELOWO`; proces docelowy - klase `target`
  i znacznik `DOCELOWO`; CSS przerywanej obwodki i tla.
- **AC-BT4** Przelacznik `#view` (3 przyciski `data-view`), klasy `v-dzis` / `v-docelowo` na `<body>`, zapis
  `sdd-board-view`; ukryty bez karteczek docelowych; CSS: w "dzis" docelowe ukryte, w "docelowo" pozostale przygaszone.
- **AC-BT5** Pasek stanu "N docelowo"; panel karteczki: `#f-target` (checkbox) wypelniany z karteczki i zapisywany
  (`target: true` albo brak pola).
- **AC-BT6** PDF: okno eksportu czyta ten sam zapisany widok; naglowek PDF "widok: dziś|docelowo|oba" przy docelowych.
- **AC-BT7** Skill `board`: `processes` - punkt o docelowych (`target: true`, `[Biz] PRD R-xxx`); `sync` - docelowe
  jako wymagania do zbudowania; format `board.json` opisuje `target`.
- **AC-BT8** Przewodnik "Jak to dziala" (Tablica warsztatowa) - zdanie o widokach dzis / docelowo / oba.
- **AC-BT9** (reczne) demo z karteczkami docelowymi: trzy widoki jak w makiecie 2026-10-06, PDF z wybranym widokiem.

## Weryfikacja
- 2026-10-06, serwer na kopii modulu demo z 6 karteczkami docelowymi (proces "Rozliczenie miesieczne z przewoznikiem"
  + krok R-031 w "Akceptacja i anulacja"): przelacznik widoczny, "6 docelowo"; "dziś" - 0 widocznych docelowych,
  "docelowo" - pozostale opacity .35, wybor zapisany; odznaczenie "docelowo" w panelu -> pole `target` usuniete
  z board.json, "5 docelowo"; PDF (Chrome bez okna) z widokiem "docelowo" - 1 strona, "widok: docelowo" w naglowku.

## Testy (TDD, przed kodem)
`board/test/board-target.test.js`: AC-BT1..AC-BT8.

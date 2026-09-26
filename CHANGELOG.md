# Changelog

## [0.6.3] - 2026-09-26
- Tablica: naglowek jak w panelu - "Wymagania do modułu: <nazwa> ▾" z menu modulow; wybor modulu na tablicy przelacza
  modul na serwerze (tablica i panel). "Nowy moduł…" przechodzi do panelu i otwiera formularz. Tytul tablicy - linia obok.
- Jeden kod menu dla panelu i tablicy (`modMenu`, `modSwitch` w ui.js, wyglad w ui.css).
- Serwer: widok tablicy z `_module` i `_modules`; pola `_...` nie trafiaja do board.json. Testy AC-U6, AC-U7 (36/36).

## [0.6.2] - 2026-09-26
- Motyw: same ikony slonce / ksiezyc, bez ramki i tla; wybrana w kolorze tekstu, druga przygaszona.

## [0.6.1] - 2026-09-26
- Motyw: bez opcji "Auto"; zamiast tekstu ikony slonce / ksiezyc (nazwa w dymku i dla czytnikow ekranu).
  Dopoki nic nie wybrano - motyw systemu i on jest zaznaczony; wybor wspolny dla panelu i tablicy.
- `pickTheme` zamiast `normTheme`, test AC-U1 (35/35).

## [0.6.0] - 2026-09-26
- Panel i tablica: wspolny pasek na gorze - zakladki "Panel modułu" | "Tablica warsztatowa" (na telefonie "Panel" | "Tablica")
  zamiast linkow "← Panel modułu" / "Tablica warsztatowa →".
- Przelacznik motywu Auto / Jasny / Ciemny: zapamietany w przegladarce, wspolny dla obu stron, zmiana w jednej karcie
  przelacza druga; ustawiany przed pierwszym malowaniem. "Auto" = jak system.
- Nowe pliki `board/ui.js`, `board/ui.css` (serwowane pod /ui.js, /ui.css); spec `docs/specs/ui-switch.md`, testy AC-U1..AC-U3 (35/35).

## [0.5.4] - 2026-09-26
- Tablica: wskazowka na pustej tablicy - dwie drogi: "Z AI" (`/sdd:board` z przyciskiem Kopiuj) i "Sam, w przegladarce"
  (4 kroki + przyklad karteczek w kolorach legendy + "Dodaj pierwszy proces"). Procesy bez karteczek: linia pod tablica
  "Kliknij + w procesie...", znika po pierwszej karteczce. Pusta tablica bez limitu wysokosci (telefon).
- `boardHint` w board-ops.js + test AC-B17 (32/32).

## [0.5.3] - 2026-09-26
- Intake: usuwanie pliku, ktory czeka na spis (✕ tylko przy "czeka na spis"), z potwierdzeniem; usuniecie ostateczne
  (plik kasowany z dysku). Plikow juz w spisie nie mozna usunac.
  Informacja pod lista plikow; skill intake: nie usuwaj ani nie przenos plikow z INDEX.md.
- Serwer: `DELETE /api/intake?name=`, chroniony jak inne zapisy, plik ze spisu -> 409; `removeIntake` + testy AC-21, AC-22, AC-24 (31/31).

## [0.5.2] - 2026-09-26
- Tablica: stan synchronizacji z plikami na karteczce - ✓ w plikach, ↻ zmieniona po synchronizacji, ! brak ID w pliku
  (bez znaczka = tylko na tablicy); podsumowanie liczb w pasku, wiersz "Pliki" w panelu.
- Stan liczy serwer: pole `synced` (ustawia agent przy `/sdd:board sync`) + sprawdzenie, czy `ref` jest w pliku `file`;
  odswiezany przy kazdej zmianie w requirements/, nie trafia do board.json.
- `syncState`, `syncMap` w board-ops.js + testy AC-B14, AC-B15 (28/28).

## [0.5.1] - 2026-09-26
- Tablica: karteczka pokazuje ID i zrodlo (jedna linia, pelne w dymku) oraz autora i date zmiany (RRRR-MM-DD HH:MM).
- Panel karteczki: Utworzono, Zmieniono, Autor, Skad, Trafia do; odswiezane na zywo.
- board.json: opcjonalne `created` / `updated` (ISO); serwer stempluje zmiany z przegladarki, skill board kaze agentowi je ustawiac.
- `stampNotes`, `fmtDate` w board-ops.js + testy AC-B11, AC-B12 (26/26).

## [0.5.0] - 2026-09-26
- Tablica: zakladanie procesow ("+ Proces", pusta tablica z "Dodaj pierwszy proces"), zmiana nazwy klikiem w nazwe
  (karteczki ida za nazwa, pusta/zajeta odrzucona), przesuwanie gora/dol, usuwanie z potwierdzeniem przy karteczkach.
- Tablica: panel edycji karteczki wysuwany z prawej (na telefonie od dolu), Escape zamyka, Cmd/Ctrl+Enter zapisuje;
  "+" w ostatniej kolumnie procesu i "+ Karteczka" w pasku; "Pas" -> "Proces".
- Tablica: na cala szerokosc, powiekszenie 50-150% z "Dopasuj" (zapamietane), nazwy procesow przyklejone przy przewijaniu.
- Tablica: kolejnosc karteczek w kolumnie - upuszczenie przed/za karteczka (kreska pokazuje miejsce),
  w panelu "↑ wyżej" / "↓ niżej" (dziala tez na telefonie).
- Tablica: typ karteczki w panelu jako przyciski jak legenda (kolor + nazwa + podpowiedz) zamiast listy rozwijanej.
- Pusta tablica bez procesow (wczesniej "Proces 1"), zeby bylo widac "Dodaj pierwszy proces".
- `board/board-ops.js` (wspolny dla przegladarki i testow) + testy AC-B1..AC-B5, AC-B8, AC-B9, spec `docs/specs/board-ui.md` (24/24).
- Skill board: czytaj board.json tuz przed edycja, nie cofaj zmian usera z przegladarki.

## [0.4.1] - 2026-09-26
- Panel: przelacznik modulu w tytule ("Wymagania do modułu: <nazwa> ▾") zamiast listy i przycisku po prawej.
  Menu: moduly z poziomem "pełny"/"lekki", na dole "+ Nowy moduł…"; Escape, klik poza menu, strzalki.
- Poziom pokazywany po polsku ("poziom pełny" zamiast "poziom full").

## [0.4.0] - 2026-09-26
- Panel: baner "Aktualny krok" zamiast "Nastepny krok".
- Intake: lista wrzuconych plikow (nazwa, rozmiar, "dodane" / "czeka na spis"), najnowsze na gorze,
  zwinieta przy wiecej niz 8 plikach, z przewijaniem.
- Intake: plik o identycznej tresci jak juz wrzucony (SHA-256) jest pomijany z informacja, pod jaka nazwa juz jest.
- Log uploadu: podsumowanie "zapisano N, pominieto M, bledy K" i tylko duplikaty/bledy z nazwami.
- Baner i karty: dopisek "Uruchom w Claude Code:" przed komenda; baner ma instrukcje "Co zrobic" (3 kroki) dla kazdego etapu.
- Testy AC-14, AC-15, AC-17 (17/17).

## [0.3.0] - 2026-09-26
- Panel: naglowek "Wymagania do modułu: <nazwa>", przelacznik modulow, "+ Nowy moduł" (folder obok, szablony, SDD.yaml, git init).
- Intake: zalaczanie plikow z przegladarki (przycisk / przeciagnij-upusc, do 25 MB) do `requirements/00-intake/`,
  oczyszczanie nazw, bez nadpisywania.
- Tablica: przycisk "← Panel modułu"; tablica przelacza sie razem z modulem; board.json powstaje dopiero przy pierwszym zapisie.
- Zapisy tylko z panelu (naglowek X-SDD + Host lokalny).
- `/sdd:init`: pytanie o zatwierdzajacych jezykiem biznesu zamiast skrotow R/D/GLOSSARY/BR.
- `board/modules.js` + testy AC-9..AC-12.

## [0.2.0] - 2026-09-26
- Widok postepu SDD pod `/` serwera tablicy (`sdd-board`): 6 etapow ze statusem z plikow, liczniki,
  nastepny krok z komenda, "blokuje dev", "czeka na biznes", ostatnie zmiany, odswiezanie SSE. Tylko podglad.
- Tablica warsztatowa przeniesiona pod `/board` (link w obie strony).
- `board/progress.js` + testy `node --test` (AC-1..AC-7 ze `docs/specs/progress-ui.md`).

## [0.1.0] - 2026-09-26
- Import kitu do repo `_DEV_/repos/sdd-kit` (wczesniej ~/Downloads/sdd-kit).
- Plugin `sdd`: skille init, intake, interview, domain, spec, validate, handover, status, board.
- Tablica warsztatowa `board/` (Node, SSE, port 4242), instalatory `install.sh` / `install.ps1`.

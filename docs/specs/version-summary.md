# Spec: "Co się zmieniło w wymaganiach" - zmiany wersji po ludzku (zmiana 0.42.0)

Status: zlecone przez wlasciciela produktu 2026-10-10 (punkty 1-3 propozycji). Rozszerza docs/specs/version-restore.md.

## Problem
"Pokaż zmiany" pokazuje linie w plikach. Przeniesienie dwoch karteczek do innego procesu wyglada jak
"`01-interview/board.json` +7 -7" - trzeba czytac JSON. Wlasciciel: "dla Ciebie to jest po prostu zmiana w pliku
i nie ma jak ocenic tego, co sie zmienilo z biznesowego punktu widzenia?"

## Cel
Zmiany wersji opisane jezykiem wymagan, wprost z danych (bez AI, bez kosztu): karteczki, procesy, pytania, decyzje,
zalozenia, wymagania, reguly, pojecia, systemy, aktorzy, encje, sekcje PRD.

Metryka: przy typowej zmianie (karteczki, status pytania, nowe wymaganie) nie trzeba otwierac "Szczegółów".

## Zakres
### 1. Tablica (`board.json`) - porownanie po `id` karteczek
- dodana / usunieta karteczka (tresc, typ, proces); przeniesiona do innego procesu (`lane` A -> B);
  zmieniona tresc (przed -> po); zmieniony typ; inne zmienione pola (np. `source`, `ref`) po nazwie.
- Pomijane (technika): `col`, `created`, `updated`, `synced`, `by`; tablica `updated`.
- Procesy (`lanes`): nowe i usuniete; tytul / podtytul tablicy.
- Nazwy typow jak na tablicy: zdarzenie, komenda, kto, reguła, widok, nie wiemy, odstęp.

### 2. Pliki wymagan (`.md`) - porownanie po kluczach
- **Wiersze tabel:** klucz = pierwsza komorka (ID `Q-001`, `A-001`, `BR-001`, `S-001` albo nazwa: pojecie, rola).
  Tytul = druga komorka (do 80 znakow). Zmiana = nazwy zmienionych kolumn z naglowka; dla kolumny `Status`
  wartosc przed -> po.
- **Bloki z naglowkiem:** kazdy naglowek `#`..`####` zaczyna blok do nastepnego naglowka. Klucz = ID na poczatku
  naglowka (`### R-001 Wpisanie…`, `## D-001 | data | tytul`), inaczej tekst naglowka (encje, sekcje PRD). Tytul =
  reszta naglowka. Pola = linie `Nazwa: wartosc` (z liniami ponizej az do nastepnego pola, np. lista kryteriow);
  tekst przed pierwszym polem = `treść`. Zmiana = nazwy zmienionych pol; `Status` przed -> po.
- Wiersz-wzor (`D-xxx`, `R-xxx`, ID z `x`) i wiersze separatora tabeli pomijane.
- Rodzaj z prefiksu ID: Q pytanie, D decyzja, A założenie, R wymaganie, BR reguła, S system; bez ID - z pliku:
  GLOSSARY pojęcie, ACTORS aktor, ENTITIES encja, inne - sekcja.
- Inne pliki (`00-intake/`, notatki z sesji itp.): tylko "nowy / usunięty / zmieniony plik".

### 3. Szczegoly
Obecna lista plikow z liniami zostaje, zwinieta pod "Szczegóły – linie w plikach".

## Interfejs
W kazdej z dwoch czesci "Pokaż zmiany" ("Co nowego w tej wersji", "Od tej wersji do dziś"): najpierw
"Co się zmieniło w wymaganiach" - grupy wg pliku (Tablica, Pytania, Decyzje, Założenia, Słownik, Reguły biznesowe,
Encje, Systemy, Aktorzy, Wymagania (PRD), inne pliki), w kazdej zdania, np.:
- Przeniesiono karteczkę „1” (nie wiemy): „Miesięczny odczyt” → „Rozliczenie miesiąca”
- Nowe pytanie Q-058 – „Czy …”
- Zmienione wymaganie R-007 – „…”: Kryteria akceptacji, Status (do zmiany → zatwierdzone)
Same zmiany techniczne -> "Tylko zmiany techniczne (kolejność, daty) – treść wymagań bez zmian."

## Architektura
- `board/req-changes.js` (nowy, czysty, bez gita): `boardChanges(oldText, newText)`, `mdChanges(oldText, newText, file)`,
  `fileChanges(file, oldText, newText, status)` -> `{ file, group, items }`.
- `repo-copy.js` `diffTrees`: dla kazdej zmienionej pary tresci (git `show <ref>:<sciezka>`, brak = pusta) ->
  `summary: [{ file, group, items }]` w `files`-czesci i w `news`.
- `ui.js` `summaryHtml(summary)` - zdania; `diffHtml` wstawia je przed "Szczegóły".

## Kryteria akceptacji
- **AC-VS1** `boardChanges`: dodana, usunieta, przeniesiona, zmieniona tresc, zmieniony typ, inne pole; pomija `col`,
  daty, `by`; nowe i usuniete procesy; tytul; zly JSON -> brak elementow (bez wyjatku).
- **AC-VS2** `mdChanges` tabele: nowy / usuniety / zmieniony wiersz (kolumny), Status przed -> po, klucz z nazwa
  (slownik), wiersz-wzor i separator pominiete.
- **AC-VS3** `mdChanges` bloki: R-001 zmienione pole wielolinijkowe (Kryteria akceptacji) i Status; nowy D-xxx;
  encja bez ID; sekcja PRD; tylko zmiana kolejnosci blokow -> brak elementow.
- **AC-VS4** `versionDiff`: `summary` w obu czesciach, z prawdziwego gita (board.json + QUESTIONS.md + plik intake).
- **AC-VS5** `summaryHtml` / `diffHtml`: zdania jak w Interfejsie, grupy wg pliku, escapowanie, "Tylko zmiany
  techniczne…", "Szczegóły – linie w plikach" jako zwijany blok; bez slow gita.
- **AC-VS6** (reczne) fv-manager: "test 5" -> „Przeniesiono karteczkę „1” … „Miesięczny odczyt” → „Rozliczenie miesiąca””.

## Poza zakresem
Streszczenie przez Claude (pozniej, osobnym przyciskiem), zmiany w diagramach mermaid opisane slowami, przemianowanie
procesu rozpoznane jako przemianowanie (jest: usuniety + nowy).

## Weryfikacja
- 2026-10-10, testy: 7 nowych (najpierw czerwone), pelny zestaw tablicy 336 OK, 0 bledow.
- 2026-10-10, parser na prawdziwym fv-manager (commit 0b40af9 -> dzis): QUESTIONS 15 zmian (Status otwarte ->
  odpowiedziane / zaparkowane), DECISIONS nowe D-031..D-033, GLOSSARY nowe "Cena kWh", RULES zmienione BR-006/007 i nowe
  BR-013/014, SYSTEMS nowe S-007..S-009, PRD R-001 (Opis, Zrodlo, Reguly, Status, Kryteria akceptacji).
- 2026-10-10, zywa tablica: "test 5" -> Tablica: „Przeniesiono karteczkę „1” (nie wiemy): „Miesięczny odczyt” →
  „Rozliczenie miesiąca”” i to samo dla „2” (AC-VS6). Poprawione: zdania dziedziczyly ramki wierszy listy wersji.

## Testy (TDD, przed kodem)
`board/test/req-changes.test.js` (AC-VS1..VS3), AC-VS4 w `version-restore.test.js`, AC-VS5 w `version-restore-ui.test.js`.

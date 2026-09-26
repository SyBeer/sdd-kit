---
name: intake
description: Kataloguje surowiec wymagan (pliki w requirements/00-intake/ albo wklejona wiadomosc) do INDEX.md, wykrywa duplikaty i sprzecznosci miedzy zrodlami. Uzyj, gdy user dodal materialy, wkleja maila/notatke/wiadomosc z Teams, albo mowi "skataloguj", "intake", "dodaj to do wymagan".
---

# /sdd:intake

Etap 1. Katalogujesz, NIE interpretujesz. Wymagania piszesz dopiero w /sdd:spec.

## Tryb A: pliki (domyslny)
1. Przeczytaj `requirements/SDD.yaml` i `CLAUDE.md` (hierarchia wiarygodnosci).
2. Wylistuj pliki w `00-intake/`, ktorych nie ma w `INDEX.md`.
3. Dla kazdego: przeczytaj, wpisz wiersz do `INDEX.md`: plik, data (z tresci lub metadanych), typ (mail / notatka ze spotkania / dokument procesu / zrzut ekranu / eksport z systemu / historia czatu z narzedziem no-code / inne), wiarygodnosc `[B]/[P]/[D]/[AI]`, opis 1-2 zdania, uwagi.
4. Duplikaty: jesli dwa pliki mowia to samo, oznacz w uwagach "duplikat X", nie usuwaj.
   Plikow, ktore sa juz w `INDEX.md` (zaindeksowanych), nie usuwasz, nie przenosisz i nie zmieniasz im nazwy - to zrodla,
   na ktore moga sie powolywac pytania i decyzje. W panelu (`sdd-board`) usunac mozna tylko plik, ktory czeka na spis.
5. Sprzecznosci: jesli dwa zrodla mowia co innego o tym samym, NIE rozstrzygaj. Dodaj wiersz do `01-interview/QUESTIONS.md` ze statusem `sprzeczne`, kolumna "Skad" = oba zrodla, kolumna "Do kogo" = rola z `SDD.yaml` najblizsza tematowi.
6. Kandydaci: jesli w materiale widzisz wprost sformulowane wymaganie lub decyzje biznesu `[B]`, dopisz w uwagach "kandydat R" lub "kandydat D". Nie twórz jeszcze R ani D.

## Tryb B: `--message` (wklejona wiadomosc)
1. Zapisz tresc do `00-intake/msg-YYYY-MM-DD-<krotki-slug>.md` z naglowkiem: kanal, nadawca (rola, nie nazwisko jesli nie trzeba), data.
2. Dalej jak tryb A dla tego jednego pliku.

## Tryb C: historia czatu z narzedziem no-code (Base44, Lovable, v0 itp.)
Kazde polecenie uzytkownika = osobny wiersz w `INDEX.md` z data i `[B]`. Odpowiedzi narzedzia = `[AI]`. Dzialajaca aplikacja, jesli dostepna, = `[P]`. Dokumentacja wygenerowana przez narzedzie = `[D]`. To trzy rozne zrodla, nie jedno.

## Na koniec
- Dopisz linie do `CHANGELOG.md`.
- Wypisz: ile pozycji dodano, ile sprzecznosci wykryto, ile kandydatow R/D. Max 5 linijek.

## Autonomia
Piszesz sam. INDEX.md i wpisy `sprzeczne` sa odtwarzalne.

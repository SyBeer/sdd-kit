---
name: intake
description: Kataloguje surowiec wymagan (pliki w requirements/00-intake/ albo wklejona wiadomosc) do INDEX.md, wykrywa duplikaty i sprzecznosci. Pierwszy przebieg porownuje zrodla miedzy soba, kolejne porownuja nowe zrodlo z modelem domeny, decyzjami i wymaganiami. Uzyj, gdy user dodal materialy, wkleja maila/notatke/wiadomosc z Teams, albo mowi "skataloguj", "intake", "dodaj to do wymagan".
---

# /sdd:intake

Etap 1. Katalogujesz, NIE interpretujesz. Wymagania piszesz dopiero w /sdd:spec.

`00-intake/` to surowiec. Model w `02-domain/` jest prawda. Z tego wynika podzial na dwa
przebiegi: pierwszy buduje punkt odniesienia, kolejne sprawdzaja sie z nim, a nie ze soba.

## Tryb A: pliki (domyslny)
1. Przeczytaj `requirements/SDD.yaml` i `CLAUDE.md` (hierarchia wiarygodnosci).
2. Wylistuj pliki w `00-intake/`, ktorych nie ma w `INDEX.md`.
3. Dla kazdego: przeczytaj, wpisz wiersz do `INDEX.md`: plik, data (z tresci lub metadanych), typ (mail / notatka ze spotkania / dokument procesu / zrzut ekranu / eksport z systemu / historia czatu z narzedziem no-code / inne), wiarygodnosc `[B]/[P]/[D]/[AI]`, kierunek, status zrodla, opis 1-2 zdania, uwagi.
   - **kierunek**: `intencja` (dokument mowi, co mielismy zbudowac), `as-built` (opisuje stan
     dzialajacej aplikacji), `potwierdzenie` (biznes potwierdza albo rozstrzyga). Rozroznia
     zrodla o tej samej wiarygodnosci - dwa dokumenty `[D]` o jednym module roznia sie
     najczesciej wlasnie tym. Jesli dokument sam zastrzega, ze bedzie nieaktualizowany,
     to `intencja` - zapisz to w uwagach.
   - **status zrodla**: na starcie `aktualne`. Pozostale wartosci (`zastapione przez <plik>`,
     `dotyczy innej wersji <X>`, `wycofane`) ustawia czlowiek albo wynikaja z decyzji biznesu.
     Zrodlo dotyczace innej wersji produktu NIE jest sprzeczne z modelem - nie zakladaj pytan.
4. Duplikaty: jesli dwa pliki mowia to samo, oznacz w uwagach "duplikat X", nie usuwaj.
   Plikow, ktore sa juz w `INDEX.md` (zaindeksowanych), nie usuwasz, nie przenosisz i nie zmieniasz im nazwy - to zrodla,
   na ktore moga sie powolywac pytania i decyzje. W panelu (`sdd-board`) usunac mozna tylko plik, ktory czeka na spis.
5. Dalej zaleznie od tego, czy model juz istnieje:
   - **nie ma `02-domain/GLOSSARY.md` z trescia** -> sekcja "Przebieg pierwszy",
   - **model istnieje** -> sekcja "Przebieg kolejny". Nie porownuj wtedy nowego zrodla ze
     starymi plikami: koszt rosnie kwadratowo, a to, co z nich wynikalo, jest juz w modelu.
6. Kandydaci: jesli w materiale widzisz wprost sformulowane wymaganie lub decyzje biznesu `[B]`, dopisz w uwagach "kandydat R" lub "kandydat D". Nie twórz jeszcze R ani D.

## Przebieg pierwszy (model jeszcze nie istnieje)
Sprzecznosci: jesli dwa zrodla mowia co innego o tym samym, NIE rozstrzygaj. Dodaj wiersz do `01-interview/QUESTIONS.md` ze statusem `sprzeczne`, kolumna "Skad" = oba zrodla, kolumna "Do kogo" = rola z `SDD.yaml` najblizsza tematowi.

Porownuj takze **uklad**, nie tylko zdania. Sprzecznosc struktury (dwa zrodla inaczej dziela
domene: osobny rekord kontra jeden rekord z dwoma polami, inny podzial na etapy) nie jest
nigdzie wypowiedziana wprost - wynika z tego, jak dokument jest zbudowany. Jesli ta sama
nazwa oznacza w dwoch zrodlach inny zbior obiektow, to sprzecznosc, nawet gdy definicje
brzmia podobnie.

## Przebieg kolejny (model istnieje)
Kolejnosc krokow jest obowiazkowa. Krok 1 przed krokiem 2, bo inaczej przeczytasz nowe
zrodlo przez model i dopasujesz je do tego, co juz wiesz, zamiast zauwazyc, ze nie pasuje.

1. **Czytanie na zimno.** Przeczytaj nowe zrodlo i wypisz, co mowi, na osiach modelu:
   pojecia / role / encje i stany / reguly / decyzje. Bez zagladania do `02-domain/*`
   i bez `03-spec/*`. Zapisz do `00-intake/porownanie-YYYY-MM-DD.md` - jeden plik na
   przebieg, sekcja per zrodlo. Wpisuj tez "brak" tam, gdzie zrodlo o czyms milczy.
2. **Porownanie z tym, co mamy**, w tej kolejnosci (od najtwardszego):
   1. `01-interview/DECISIONS.md` (`D-xxx`) - biznes juz rozstrzygnal,
   2. `02-domain/ENTITIES.md` - encje, pola, stany, przejscia,
   3. `02-domain/RULES.md` (`BR-xxx`),
   4. `02-domain/GLOSSARY.md`, `02-domain/ACTORS.md`,
   5. `01-interview/ASSUMPTIONS.md` (`A-xxx`),
   6. `03-spec/PRD.md` (`R`, `AC`) - jesli spec juz byl,
   7. `01-interview/QUESTIONS.md` - pytania otwarte i zadane.
3. **Klasyfikacja kazdego trafienia.** Piec klas, kazda inaczej obslugiwana:

| Klasa | Kiedy | Co robisz |
|-------|-------|-----------|
| `potwierdza` | zrodlo zgadza sie z elementem modelu | dopisz zrodlo do kolumny `Zrodlo` tego elementu. Jesli element stoi na `A niepotwierdzone`, a nowe zrodlo to `[B]` - zaproponuj potwierdzenie `A` (PYTASZ). Pamietaj: zgodnosc dwoch `[D]` nie jest potwierdzeniem |
| `zamyka Q` | zrodlo odpowiada na pytanie otwarte lub zadane | zaproponuj `D-xxx` albo potwierdzenie `A` (PYTASZ). Jedyna klasa, ktora daje postep, nie prace - szukaj jej swiadomie |
| `uzupelnia` | model nie ma czegos, co zrodlo ma | "kandydat R" lub "kandydat BR" w uwagach `INDEX.md`. Nie dopisuj do modelu sam - to robi /sdd:domain |
| `sprzeczne` | konflikt, nowe zrodlo NIE jest wyzej w hierarchii | wiersz `sprzeczne` w `QUESTIONS.md`, "Skad" = `porownanie z modelem` + element modelu + nowe zrodlo |
| `podmywa model` | konflikt, nowe zrodlo JEST wyzej w hierarchii | element modelu dostaje status `zakwestionowane (Q-xxx)`, powstaje pytanie, ruszasz kaskade do sekcji 6 PRD. Nie poprawiasz modelu sam |

4. **Trafienie w `D-xxx` to osobna, najciezsza klasa.** Biznes juz rozstrzygnal, wiec nie ma
   pytania "ktore prawdziwe". Zakladasz `Q` z "Skad" = `wniosek o ponowne otwarcie D-xxx`
   i przechodzisz kaskade od tej decyzji w dol (co z niej wynikalo). Rozstrzyga ten, kto
   decyzje podjal - rola z `SDD.yaml`.
5. **Sprzecznosc totalna.** Jesli trafienia obejmuja encje, ich pola, stany albo przejscia,
   NIE zakladaj kilkudziesieciu pytan o szczegoly. Zglos **przebudowe modelu**: wypisz liste
   trafien, zaloz jedno pytanie o rozstrzygniecie na poziomie modelu i odeslij do /sdd:domain.
   Kryterium nie jest liczba trafien, tylko to, w co trafiaja: nazwa albo wartosc = zwykla
   sprzecznosc, struktura encji albo maszyna stanow = przebudowa.
   Rozwaz tez, czy to nie przypadek na `status zrodla`: jedno zrodlo w calosci nieaktualne
   zamyka sie jedna decyzja ("zastapione przez"), a nie dwudziestoma pytaniami.

## Tryb B: `--message` (wklejona wiadomosc)
1. Zapisz tresc do `00-intake/msg-YYYY-MM-DD-<krotki-slug>.md` z naglowkiem: kanal, nadawca (rola, nie nazwisko jesli nie trzeba), data.
2. Dalej jak tryb A dla tego jednego pliku. Wiadomosc od biznesu to `[B]` i kierunek
   `potwierdzenie` - czyli przy istniejacym modelu najczesciej wyladuje w klasie
   `podmywa model` albo `zamyka Q`.

## Tryb C: historia czatu z narzedziem no-code (Base44, Lovable, v0 itp.)
Kazde polecenie uzytkownika = osobny wiersz w `INDEX.md` z data i `[B]`. Odpowiedzi narzedzia = `[AI]`. Dzialajaca aplikacja, jesli dostepna, = `[P]`. Dokumentacja wygenerowana przez narzedzie = `[D]`. To trzy rozne zrodla, nie jedno.
Kierunek: polecenia = `intencja`, dokumentacja z narzedzia = `as-built`, sama aplikacja = `as-built`.

## Na koniec
- Dopisz linie do `CHANGELOG.md`.
- Wypisz max 5 linijek: ile pozycji dodano, a przy przebiegu kolejnym liczby per klasa
  (`potwierdza` / `zamyka Q` / `uzupelnia` / `sprzeczne` / `podmywa model`) i czy zglaszasz
  przebudowe modelu.

## Autonomia
Piszesz sam: `INDEX.md`, `porownanie-*.md`, wpisy `sprzeczne`, status `zakwestionowane`
i kaskade (odtwarzalne z hierarchii zrodel).
Pytasz: potwierdzenie albo obalenie `A`, nowa `D`, zdjecie statusu `zakwestionowane`.
Nie poprawiasz modelu sam - definicje i reguly zmienia /sdd:domain za zgoda czlowieka.

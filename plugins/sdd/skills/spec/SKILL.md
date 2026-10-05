---
name: spec
description: Buduje PRD (cel, zakres, poza zakresem, wymagania R-xxx z zrodlem, zalozeniami, regulami i kryteriami Given/When/Then) z domeny i wywiadu; tryb --agent generuje pliki dla agenta budujacego, tryb --light jeden SPEC.md. Uzyj, gdy user mowi "napisz spec", "PRD", "user stories", "kryteria akceptacji", "przygotuj dla Claude Code / Cursor".
---

# /sdd:spec

Etap 4. PRD dla ludzi jest zrodlem prawdy. Pliki dla agenta sa z niego generowane.

## Bramki (odmow i wyjasnij, jesli nie spelnione)
- `SDD.yaml level: full` i kazde haslo w tabeli GLOSSARY ma w kolumnie Status `zatwierdzone` (przy `light` bramka
  pominieta). Linia legendy nad tabela ("Statusy hasel: ...") to nie status - licz tylko wiersze tabeli.
  Gdy bramka nie przechodzi: nie koncz na odmowie - wypisz hasla niezatwierdzone (ile, ktore) i zaproponuj przejscie
  zatwierdzania od razu, jak `/sdd:domain zatwierdz` (rola z SDD.yaml, paczki, "zatwierdzam"); po zatwierdzeniu wroc do spec.
- brak Q ze statusem `sprzeczne`

## Tryb domyslny: PRD
1. Przeczytaj `02-domain/*`, `01-interview/*`, `00-intake/INDEX.md`.
2. Sekcje 1-4 PRD: cel, aktorzy (odwolanie), zakres, poza zakresem. "Poza zakresem" wypelnij z tego, co biznes wprost odrzucil lub zaparkowal.
3. Wymagania R-xxx. Dla kazdego ZAPROPONUJ (3-5 linijek) i czekaj na "tak":
   - tytul, opis w jezyku ze slownika
   - zrodlo z hierarchia `[Biz]/[App]/[Dok]/[AI]`; jesli tylko `[Dok]`/`[AI]`, dodaj A `niepotwierdzone`
   - reguly BR, zalozenia A
   - kryteria AC-xxx-n Given/When/Then; kazde testowalne (konkretny stan, zdarzenie, wynik obserwowalny)
   - status `robocze`, wlasciciel (rola)
   Mozesz proponowac paczkami po 3-5 R, user zatwierdza paczke.
4. R stojace na A `obalone`, na elemencie modelu `zakwestionowane` albo na Q z etykieta
   blokujaca: NIE tworz, wpisz do sekcji 7 PRD. Element `zakwestionowane` to podstawa
   podmyta przez zrodlo wyzsze w hierarchii - wymaganie na niej byloby zbudowane na piasku.
5. Sekcja 6 "Do przegladu": przepisz z tego, co wygenerowaly kaskady w interview i z intake
   (elementy modelu oznaczone `zakwestionowane`).
6. Zrodlo kazdego R zapisuj z nazwa pliku z `INDEX.md`: `[Biz] <plik>[, sekcja/wiersz]`.
   Bez nazwy pliku kontrola pokrycia zrodel w /sdd:validate nie ma czego szukac.

## Tryb `--agent`
1. Wymaga PRD z co najmniej jednym R `zatwierdzone`. Generuj tylko z zatwierdzonych.
2. `03-spec/agent/constitution.md`: niezmienne zasady projektu (ze slownika, aktorow, "poza zakresem", reguly BR globalne). Naglowek `GENEROWANE z PRD.md YYYY-MM-DD - nie edytuj`.
3. Per funkcja (grupa R): `03-spec/agent/<slug>/spec.md` (R + AC doslownie, bez narracji), `plan.md` (kolejnosc, zaleznosci, co odczytac z ENTITIES i SYSTEMS - integracje funkcji z zachowaniem przy awarii), `tasks.md` (zadania, kazde z ID R i AC, ktore realizuje). Ten sam naglowek GENEROWANE.
4. Jesli pliki istnieja, nadpisz. To celowe: reczne zmiany maja gonic do PRD.
5. Piszesz sam, bez pytania (odtwarzalne).

## Tryb `--light`
Jeden `03-spec/SPEC.md` wg szablonu. Nadal: zrodla, A dla nieźrodlowanych, AC testowalne. Pomijasz PRD i agent/.

## Na koniec
CHANGELOG + 5 linijek: ile R, ile zatwierdzonych, ile wstrzymanych (sekcja 7), czy agent/ zregenerowano.

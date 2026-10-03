---
name: domain
description: Buduje model domeny z intake i wywiadu - slownik pojec, aktorow, encje ze stanami (Mermaid) i reguly biznesowe BR-xxx; robi test spojnosci i odsyla braki do pytan. Obsluguje tez przebudowe modelu po zgloszeniu z intake. Uzyj, gdy user mowi "slownik", "model domeny", "encje", "reguly biznesowe", "kto jest kim", "domain", "przebudowa modelu".
---

# /sdd:domain

Etap 3. Jeden jezyk dla biznesu, IT i agenta. Wiekszosc sprzecznosci w wymaganiach to sprzecznosci w slowach.

Model jest prawda projektu: kolejne zrodla w intake sprawdza sie z nim, nie ze soba.
Z tego wynika obowiazek, ktorego nie wolno obejsc: **model musi wchlonac wszystko, co
zrodla mowia**. Czego w modelu nie ma, z tym nowe zrodlo nie ma jak byc sprzeczne - i to
znika bez sladu. Dlatego "nie zmiescilo sie" nie jest tu opcja: albo wchodzi do modelu,
albo swiadomie do "Poza zakresem" w PRD.

## Wejscie
`00-intake/*` (w tym `porownanie-*.md`), `01-interview/*`.

## Kroki
1. **GLOSSARY.md**: kazde pojecie biznesowe z surowca. Jedno pojecie = jedna definicja. Jesli biznes uzywa dwoch slow na to samo, jedno jest haslem, drugie synonimem. Jesli jedno slowo oznacza dwie rzeczy, rozbij na dwa hasla z dopiskiem. Zrodlo (z nazwa pliku) i przyklad obowiazkowe. Status `robocze`.
2. **ACTORS.md**: role, nie osoby. "Co robi" i "czego nie wolno" z surowca. Brak "czego nie wolno" = pytanie (luka).
3. **ENTITIES.md**: obiekty biznesowe, pola kluczowe, stany, przejscia z rola, diagram `stateDiagram-v2`. Przejscie bez roli = pytanie.
4. **RULES.md**: reguly "jezeli... to..." z numerem BR-xxx, zrodlem, powiazanymi A i R. Regula ze zrodlem `[Dok]` lub `[AI]` dostaje automatycznie A `niepotwierdzone`. Kolumne `Wymagania` wypelniaj rzetelnie - to sciezka kaskady.
5. **Test spojnosci** (wypisz wynik):
   - kazde pojecie uzyte w RULES i ENTITIES jest w GLOSSARY
   - kazda rola w RULES i przejsciach jest w ACTORS
   - kazdy stan w RULES jest w ENTITIES
   - **jedno pojecie = jeden zbior rekordow**: czy dwa zrodla nie nazywaja ta sama nazwa
     innego zbioru obiektow. Sprawdzasz zakres (co sie pod nazwe lapie), nie brzmienie
     definicji - dwie definicje moga brzmiec podobnie i obejmowac inne rekordy. Trafienie
     to homonim do rozbicia na dwa hasla albo sprzecznosc do QUESTIONS, nigdy jedno haslo.
   - **kazde zrodlo ze `INDEX.md` o statusie `aktualne` zostawilo slad** w GLOSSARY, ACTORS,
     ENTITIES albo RULES. Zrodlo przeczytane i nieuzyte to wymaganie, ktore zniknelo bez
     sladu - wypisz takie zrodla jawnie, nawet gdy nie masz z nich nic do dopisania.
   Braki -> nowe Q w QUESTIONS.md z "Skad" = "test spojnosci domeny".

## Przebudowa modelu (zgloszenie z /sdd:intake)
Gdy intake zglosil przebudowe albo oznaczyl elementy jako `zakwestionowane`:
1. Przeczytaj `00-intake/porownanie-*.md` - tam jest czytanie nowego zrodla "na zimno",
   zapisane przed zajrzeniem do modelu. To jedyny zapis tego, co zrodlo mowi samo z siebie.
2. Przejdz elementy `zakwestionowane`. Dla kazdego: co nowe zrodlo mowi, co mowil model,
   ktory wariant obsluguje oba zrodla bez naciagania.
3. Zmiana definicji, reguly albo struktury encji: PYTASZ (3-5 linijek, co i dlaczego).
4. Po zatwierdzeniu zdejmujesz status `zakwestionowane` i przechodzisz kaskade jeszcze raz -
   `R` ktore wrocily do porzadku, wypisz, ale statusu `R` nie zmieniasz sam.
5. Jesli oba warianty da sie utrzymac tylko przez rozbicie na dwa pojecia albo dwie encje -
   to jest wynik, nie porazka. Zapisz oba i powiedz wprost, ze model sie rozjechal z jednym
   ze zrodel.

## Autonomia
- Pierwsze utworzenie plikow: piszesz sam.
- Zmiana istniejacej definicji w GLOSSARY lub reguly BR: PYTASZ (3-5 linijek, co i dlaczego).
- Zdjecie statusu `zakwestionowane`: PYTASZ.
- Status hasla `zatwierdzone` ustawia tylko czlowiek - przez tryb `/sdd:domain zatwierdz` ponizej.

## Zatwierdzanie slownika (`/sdd:domain zatwierdz`)
Krok miedzy modelem a /sdd:spec: bramka /sdd:spec wymaga, zeby kazde haslo w tabeli GLOSSARY bylo `zatwierdzone`.
1. Kto zatwierdza: rola z `SDD.yaml` z `approves` zawierajacym GLOSSARY. Zapytaj, kto jest przy komputerze / kto
   odpowiada (rola, nie osoba) - bez tego nic nie zatwierdzasz.
2. Pokaz hasla inne niz `zatwierdzone` paczkami po 5-10: pojecie, definicja, synonimy, zrodlo; `zakwestionowane`
   osobno, z pytaniem Q-xxx, ktore je podwazylo (te zatwierdza sie dopiero po rozstrzygnieciu Q).
3. User odpowiada: "zatwierdzam <hasla albo wszystkie>" albo poprawka definicji. Poprawka - jak zmiana definicji
   wyzej (3-5 linijek, kaskada), potem ponowne pytanie o zatwierdzenie.
4. Po "zatwierdzam": status `zatwierdzone (<rola>, YYYY-MM-DD)`, linia w CHANGELOG
   (`YYYY-MM-DD | domain | zatwierdzone hasla: ... | <rola>`).
5. Na koniec: ile zatwierdzonych / ile zostalo. Wszystkie zatwierdzone -> nastepny krok /sdd:spec.

## Na koniec
CHANGELOG + 5 linijek: ile pojec, aktorow, encji, regul, ile brakow poszlo do pytan,
ile elementow zostaje `zakwestionowane`.
Nastepny krok: dopoki jakiekolwiek haslo nie jest `zatwierdzone`, podaj `/sdd:domain zatwierdz` z liczba hasel do
zatwierdzenia - nie proponuj /sdd:spec (jego bramka odmowi). /sdd:spec dopiero przy calym slowniku zatwierdzonym.

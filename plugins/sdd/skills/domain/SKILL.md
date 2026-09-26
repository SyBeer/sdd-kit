---
name: domain
description: Buduje model domeny z intake i wywiadu - slownik pojec, aktorow, encje ze stanami (Mermaid) i reguly biznesowe BR-xxx; robi test spojnosci i odsyla braki do pytan. Uzyj, gdy user mowi "slownik", "model domeny", "encje", "reguly biznesowe", "kto jest kim", "domain".
---

# /sdd:domain

Etap 3. Jeden jezyk dla biznesu, IT i agenta. Wiekszosc sprzecznosci w wymaganiach to sprzecznosci w slowach.

## Wejscie
`00-intake/*`, `01-interview/*`.

## Kroki
1. **GLOSSARY.md**: kazde pojecie biznesowe z surowca. Jedno pojecie = jedna definicja. Jesli biznes uzywa dwoch slow na to samo, jedno jest haslem, drugie synonimem. Jesli jedno slowo oznacza dwie rzeczy, rozbij na dwa hasla z dopiskiem. Zrodlo i przyklad obowiazkowe. Status `robocze`.
2. **ACTORS.md**: role, nie osoby. "Co robi" i "czego nie wolno" z surowca. Brak "czego nie wolno" = pytanie (luka).
3. **ENTITIES.md**: obiekty biznesowe, pola kluczowe, stany, przejscia z rola, diagram `stateDiagram-v2`. Przejscie bez roli = pytanie.
4. **RULES.md**: reguly "jezeli... to..." z numerem BR-xxx, zrodlem, powiazanymi A i R. Regula ze zrodlem `[D]` lub `[AI]` dostaje automatycznie A `niepotwierdzone`.
5. **Test spojnosci** (wypisz wynik):
   - kazde pojecie uzyte w RULES i ENTITIES jest w GLOSSARY
   - kazda rola w RULES i przejsciach jest w ACTORS
   - kazdy stan w RULES jest w ENTITIES
   Braki -> nowe Q w QUESTIONS.md z "Skad" = "test spojnosci domeny".

## Autonomia
- Pierwsze utworzenie plikow: piszesz sam.
- Zmiana istniejacej definicji w GLOSSARY lub reguly BR: PYTASZ (3-5 linijek, co i dlaczego).
- Status GLOSSARY `zatwierdzone` ustawia tylko czlowiek. Przypomnij: bez zatwierdzonego slownika /sdd:spec odmowi pracy.

## Na koniec
CHANGELOG + 5 linijek: ile pojec, aktorow, encji, regul, ile brakow poszlo do pytan.

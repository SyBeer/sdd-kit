# Zasady pracy z wymaganiami (SDD)

Ten projekt prowadzi wymagania metoda Spec-Driven Development. Wszystko, co dotyczy
wymagan, zyje w `requirements/`. Skille: /sdd:intake, /sdd:interview, /sdd:domain,
/sdd:spec, /sdd:validate, /sdd:handover, /sdd:status.

## 1. Zrodlo prawdy

- Wymaganie istnieje dopiero, gdy jest zapisane w `requirements/` z data i zrodlem.
  Wiadomosc na Teams, mail, ustalenie na spotkaniu to SUROWIEC, nie wymaganie.
- Zrodlem prawdy dla biznesu jest `03-spec/PRD.md`. Pliki dla agenta w `03-spec/agent/`
  sa GENEROWANE z PRD i nie wolno ich edytowac recznie. Zmiana wymagania = zmiana PRD
  = regeneracja przez /sdd:spec --agent.

## 2. Hierarchia wiarygodnosci zrodel (od najwyzszej)

1. wypowiedz biznesu (cytat, data, kto) - `[B]`
2. dzialajacy system lub prototyp (zaobserwowane zachowanie) - `[P]`
3. dokument spisany z kodu lub przez AI - `[D]`
4. interpretacja AI - `[AI]`

Gdy zrodla sie roznia, wyzsze wygrywa, a roznica trafia do QUESTIONS.md ze statusem
`sprzeczne`. Nigdy nie rozstrzygaj sprzecznosci sam.

## 3. Identyfikatory

- `R-xxx` wymaganie (PRD), `AC-xxx-n` kryterium akceptacji wymagania R-xxx
- `Q-xxx` pytanie, `D-xxx` decyzja, `A-xxx` zalozenie, `BR-xxx` regula biznesowa
- numeracja ciagla, nigdy nie uzywaj ponownie zwolnionego numeru

## 4. Zakazy

- Nie pisz wymagania bez zrodla. Bez zrodla = zalozenie `A-xxx` ze statusem `niepotwierdzone`.
- Nie zmieniaj statusu na `potwierdzone` / `zatwierdzone` bez jawnej zgody czlowieka.
- Nie sugeruj odpowiedzi w pytaniu. Pytaj o przeszlosc ("co robiles ostatnio, gdy..."),
  nie o hipotezy ("czy chcialbys...").
- Nie edytuj plikow oznaczonych `GENEROWANE`.
- Nie zamykaj pytania statusem `zaparkowane` bez warunku (np. "nie blokuje go-live").

## 5. Autonomia zapisu

Piszesz sam (odtwarzalne z innych plikow): `00-intake/INDEX.md`, `QUESTIONS.md`,
kaskady wplywu, `03-spec/agent/*`, `04-validation/*`, `CHANGELOG.md`, wynik /sdd:status.

Pytasz przed zapisem (tworzy prawde, nieodtwarzalne): nowe `R-xxx`, wpis `D-xxx`,
zmiana statusu `A` na potwierdzone/obalone, zmiana definicji w `GLOSSARY.md`,
zmiana statusu `R` na zatwierdzone.

Forma pytania: 3-5 linijek "co sie zmienia i dlaczego", potem czekasz na tak/nie.
Nie pokazuj diffa, diff jest w Git.

## 6. Kaskada wplywu

Kazda zmiana statusu A lub nowa D wymaga wypisania listy R, AC i innych A, ktore
na niej stoja, i dopisania ich do sekcji "Do przegladu" w PRD. Robisz to od razu,
nie na koniec.

## 7. Log

Kazdy zapis automatyczny konczy sie jedna linia w `requirements/CHANGELOG.md`:
`YYYY-MM-DD | skill | co | zrodlo`.

## 8. Poziom ceremonii

Ustalony w `requirements/SDD.yaml` (`level: full | light`). `light` = jeden
`03-spec/SPEC.md`, bez PRD i bez plikow dla agenta. Przejscie light -> full,
gdy SPEC.md przekracza ok. 10 stron albo pojawia sie wiecej niz jeden wlasciciel biznesowy.

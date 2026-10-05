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
- `00-intake/` to SUROWIEC, model w `02-domain/` jest PRAWDA. Kolejne zrodlo sprawdzasz
  z modelem, decyzjami, zalozeniami i wymaganiami - nie ze starymi plikami zrodlowymi.
  Nie wyprowadzaj wymagan "z plikow", tylko z modelu.

## 2. Hierarchia wiarygodnosci zrodel (od najwyzszej)

1. wypowiedz biznesu (cytat, data, kto) - `[Biz]`
2. dzialajaca aplikacja, system lub prototyp (zaobserwowane zachowanie) - `[App]`
3. dokument spisany z kodu lub przez AI - `[Dok]`
4. interpretacja AI - `[AI]`

Zapis zrodla wszedzie: `[Biz]/[App]/[Dok]/[AI] <plik z INDEX.md>[, sekcja/wiersz]`. Nazwa pliku
jest obowiazkowa - na niej stoi kontrola pokrycia zrodel w /sdd:validate.
Starsze pliki (dawniej): `[B]` = `[Biz]`, `[P]` = `[App]`, `[D]` = `[Dok]` - czytaj tak samo, nowe wpisy pisz nowymi oznaczeniami.

Gdy zrodla sie roznia, wyzsze wygrywa, a roznica trafia do QUESTIONS.md ze statusem
`sprzeczne`. Nigdy nie rozstrzygaj sprzecznosci sam.

Dwa zrodla na tym samym poziomie moga sie roznic kierunkiem: `intencja` (co mielismy
zbudowac) kontra `as-built` (jak dziala teraz). Kierunek jest w `00-intake/INDEX.md`.
Na pytanie "jak dziala" wygrywa `as-built`, na "co mielismy zbudowac" - `intencja`.

Zgodnosc dwoch zrodel `[Dok]` NIE jest potwierdzeniem. Dwa dokumenty spisane z tej samej
aplikacji powtarzaja ten sam blad. Potwierdza tylko `[Biz]`.

Decyzja `D-xxx` powstaje tylko ze slow biznesu - zrodlo `[Biz]` z nazwa pliku (sesja, runda, wiadomosc).
To, co wynika z `[App]`/`[Dok]`/`[AI]`, zapisujesz jako `A-xxx` `niepotwierdzone` z tym zrodlem - one mowia,
jak jest, nie ze biznes tak chce (np. "limit 5000 zl, bo tak jest w kodzie"); wraca to do biznesu jako pytanie.
Zgoda czlowieka na propozycje wpisu nie zastepuje zrodla:
bez slow biznesu to nadal nie jest decyzja biznesu.

## 3. Identyfikatory

- `R-xxx` wymaganie (PRD), `AC-xxx-n` kryterium akceptacji wymagania R-xxx
- `Q-xxx` pytanie, `D-xxx` decyzja, `A-xxx` zalozenie, `BR-xxx` regula biznesowa
- `S-xxx` system (rejestr `02-domain/SYSTEMS.md`: integracje, master danych, zachowanie przy awarii)
- numeracja ciagla, nigdy nie uzywaj ponownie zwolnionego numeru

## 4. Zakazy

- Nie pisz wymagania bez zrodla. Bez zrodla = zalozenie `A-xxx` ze statusem `niepotwierdzone`.
- Nie zapisuj `D-xxx` ze zrodlem innym niz `[Biz]` - wniosek z kodu albo dokumentu to `A-xxx` (sekcja 2).
- Nie zmieniaj statusu na `potwierdzone` / `zatwierdzone` bez jawnej zgody czlowieka.
- Nastepny krok podawaj zgodnie z bramkami: slownik (GLOSSARY) z haslami niezatwierdzonymi -> `/sdd:domain zatwierdz`,
  nie /sdd:spec (jego bramka odmowi). Panel (`sdd-board`) pokazuje ten sam krok.
- Nie sugeruj odpowiedzi w pytaniu. Pytaj o przeszlosc ("co robiles ostatnio, gdy..."),
  nie o hipotezy ("czy chcialbys...").
- Nie edytuj plikow oznaczonych `GENEROWANE`.
- Nie zamykaj pytania statusem `zaparkowane` bez warunku (np. "nie blokuje go-live").

## 5. Autonomia zapisu

Piszesz sam (odtwarzalne z innych plikow): `00-intake/INDEX.md`, `QUESTIONS.md`,
`00-intake/porownanie-*.md`, kaskady wplywu, oznaczenie elementu modelu jako
`zakwestionowane`, `03-spec/agent/*`, `04-validation/*`, `CHANGELOG.md`, wynik /sdd:status.

Pytasz przed zapisem (tworzy prawde, nieodtwarzalne): nowe `R-xxx`, wpis `D-xxx`,
zmiana statusu `A` na potwierdzone/obalone, zmiana definicji w `GLOSSARY.md`,
zmiana statusu `R` na zatwierdzone, zdjecie statusu `zakwestionowane`.

Forma pytania: 3-5 linijek "co sie zmienia i dlaczego", potem czekasz na tak/nie.
Nie pokazuj diffa, diff jest w Git.

## 6. Kaskada wplywu

Wyzwalacze kaskady - kazdy wymaga wypisania listy R, AC i innych A, ktore na danym
elemencie stoja, i dopisania ich do sekcji "Do przegladu" w PRD. Robisz to od razu,
nie na koniec:

- zmiana statusu `A`,
- nowa `D`,
- oznaczenie elementu modelu jako `zakwestionowane` (pojecie w GLOSSARY, `BR` w RULES,
  rola w ACTORS, stan lub przejscie w ENTITIES).

Sciezka propagacji jest w danych: `RULES.md` ma kolumne `Wymagania`, a kazde `R` w PRD
ma pola `Zalozenia` i `Reguly`. Czyli `BR-xxx` zakwestionowane -> wszystkie `R` cytujace
te regule -> sekcja 6 PRD.

## 6a. Status `zakwestionowane`

Gdy nowe zrodlo jest WYZEJ w hierarchii niz to, na ktorym stoi element modelu, i mowi
co innego - model przegrywa. Wtedy: element dostaje status `zakwestionowane (Q-xxx)`,
powstaje pytanie, rusza kaskada. Nie kasujesz i nie poprawiasz modelu sam - rozstrzyga
czlowiek, proces tylko pokazuje zasieg. `R` stojace na elemencie `zakwestionowane`
jest blokerem w /sdd:validate.

## 7. Log

Kazdy zapis automatyczny konczy sie jedna linia w `requirements/CHANGELOG.md`:
`YYYY-MM-DD | skill | co | zrodlo`.

## 8. Poziom ceremonii

Ustalony w `requirements/SDD.yaml` (`level: full | light`). `light` = jeden
`03-spec/SPEC.md`, bez PRD i bez plikow dla agenta. Przejscie light -> full,
gdy SPEC.md przekracza ok. 10 stron albo pojawia sie wiecej niz jeden wlasciciel biznesowy.

## Budowa z zadan w Redmine (`backlog: redmine`)

Budujesz z `03-spec/agent/*/tasks.md`, nie z opisow w Redmine (pliki sa zgodne z PRD). Numer zadania w Redmine
jest w `requirements/04-validation/TRACEABILITY.md`. Zaczynasz zadanie -> `/sdd:handover status #<id> start`;
kod i testy kryteriow gotowe, commit zrobiony -> `/sdd:handover status #<id> done` z hashem commita i kryteriami.
Statusow UAT i zamykajacych nie ustawiasz.

## Klucze API

Klucze (np. Redmine) leza w `~/.sdd-kit/.env` i czyta je tylko kit (skrypty, panel sdd-board).
Nie otwieraj, nie wypisuj i nie kopiuj tego pliku ani hasel z Peku kluczy. Brakuje klucza -> popros
czlowieka, zeby ustawil go w panelu (Konfiguracja); nigdy nie pros o wklejenie klucza w czacie.

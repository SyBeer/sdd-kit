# Systemy i integracje: mapa systemow i proces systemowy (zmiana 0.31.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-05). Wersja docelowa: 0.31.0.

## Problem
Model domeny w sdd-kit ma ludzi (ACTORS), obiekty (ENTITIES), reguly (RULES) i procesy biznesowe (tablica),
ale nie ma systemow. Wymagania najczesciej pekaja na styku systemow, nie na regulach biznesu:
- nikt nie ustala, ktory system jest wlascicielem danej informacji (dwa systemy "maja racje" o kliencie),
- nikt nie pyta, co robimy, gdy system zewnetrzny nie odpowiada albo zwraca stare dane,
- czestotliwosc i kierunek wymiany danych wychodza dopiero w budowie, jako niespodzianka,
- integracja nie ma wlasciciela po stronie biznesu, wiec nie ma kogo zapytac.

## Cel
1. Jeden plik `02-domain/SYSTEMS.md`: rejestr systemow + mapa kontekstu (diagram systemow).
2. Proces systemowy (sekwencja krokow miedzy systemami) tylko dla integracji oznaczonych jako krytyczne.
3. Pytania o systemy wchodza do zwyklego obiegu (interview -> D/A), kontrole do validate, liczby do panelu.

Metryka produktowa: w pierwszym projekcie z integracjami (fv-manager) kazda integracja ma w SYSTEMS.md
wlasciciela, kierunek i zachowanie przy awarii, a w budowie nie pojawia sie pytanie "skad te dane" spoza pliku.

## Zakres
- poziom `full`; przy `light` SYSTEMS.md opcjonalny, kontrole 17-19 pomijane,
- SDD zostaje przy CO, nie JAK: dane, kierunek, czestotliwosc widziana przez biznes, zachowanie przy awarii.

## Poza zakresem
- architektura techniczna: protokoly, endpointy, kolejki, formaty, uwierzytelnianie - to faza budowy,
- renderowanie diagramow mermaid w panelu (panel dziala lokalnie bez bibliotek z sieci; diagram renderuja
  VS Code, gitea, GitHub) - panel pokazuje rejestr jako liste,
- karteczka "system" na tablicy warsztatowej - etap 2, osobna zmiana po sprawdzeniu etapu 1 na fv-manager.

## Model danych: `02-domain/SYSTEMS.md`
```
# Systemy

| ID | System | Rola | Wlasciciel | Master dla | Wymiana | Przy awarii | Krytyczna | Status | Zrodlo |
|----|--------|------|------------|------------|---------|-------------|-----------|--------|--------|
| S-001 | Home Assistant | zewnetrzny | wlasciciel instalacji | Odczyt licznika | -> my, co 15 min | ostatni odczyt + oznaczenie "nieaktualne" | tak | robocze | [App] ... |
```
- `ID` `S-xxx`, numeracja ciagla jak inne identyfikatory,
- `Rola`: `nasz` (budowana aplikacja, dokladnie jeden) / `zewnetrzny` / `reczny` (Excel, mail - tez system, jesli niesie dane),
- `Wlasciciel`: rola biznesowa odpowiedzialna za integracje (nie osoba),
- `Master dla`: encje albo pola z ENTITIES/GLOSSARY, dla ktorych ten system jest zrodlem prawdy,
- `Wymiana`: kierunek (`-> my`, `my ->`, `<->`) i czestotliwosc jezykiem biznesu (co 15 min, na zadanie, raz dziennie),
- `Przy awarii`: co widzi uzytkownik i co robi aplikacja, gdy system nie odpowiada; to jest wymaganie, nie detal,
- `Krytyczna`: `tak` = bez niej proces biznesowy staje; dla `tak` obowiazkowy proces systemowy,
- `Status` jak w GLOSSARY: `robocze` / `zatwierdzone` / `zakwestionowane (Q-xxx)`,
- `Zrodlo` z hierarchia; wiedza z kodu/dokumentu = `[App]`/`[Dok]` + `A` `niepotwierdzone` (docs/specs/decisions.md).

Pod tabela:
- `## Mapa systemow` - `flowchart LR` w mermaid, generowany z tabeli (system nasz w srodku, strzalki z danymi),
  naglowek `GENEROWANE z tabeli - nie edytuj`, odtwarzany przy kazdym przebiegu /sdd:domain,
- `## Proces systemowy: <nazwa>` - `sequenceDiagram` dla kazdej integracji `Krytyczna = tak`: kroki, dane,
  galaz `alt` przy awarii. Piszesz z propozycja i "tak" czlowieka (jak definicje).

Gdy aplikacja nie ma integracji: plik z jednym wierszem `nasz` i zdaniem "brak integracji [Biz] <zrodlo>" -
swiadome "nie ma", a nie brak pliku.

## Kryteria akceptacji

### Szablon i domena
- **AC-SY1** `templates/requirements/02-domain/SYSTEMS.md` istnieje z tabela o kolumnach jak wyzej i sekcja
  `## Mapa systemow`; `/sdd:init` go kopiuje (jak pozostale szablony domeny).
- **AC-SY2** Skill domain: krok SYSTEMS po ENTITIES - systemy z surowca, `Master dla` wskazuje encje z ENTITIES,
  mapa generowana z tabeli; proces systemowy dla `Krytyczna = tak` proponowany do "tak".
- **AC-SY3** Test spojnosci domeny (skill domain) rozszerzony: kazda encja z polem pochodzacym spoza aplikacji ma
  mastera w SYSTEMS; zadna encja/pole nie ma dwoch masterow (trafienie -> Q `sprzeczne`).
- **AC-SY4** Zmiana `Master dla`, `Przy awarii` albo `Krytyczna` w istniejacym wierszu = PYTASZ (jak definicja w GLOSSARY).

### Interview
- **AC-SY5** Skill interview: piata regula generowania pytan **Luka integracji** - system albo przeplyw danych
  w surowcu bez wlasciciela, kierunku, czestotliwosci lub zachowania przy awarii; pytanie o przeszlosc
  ("co sie stalo ostatnio, gdy <system> nie odpowiadal").
- **AC-SY6** Wiedza o integracjach z kodu (`[App]`) wchodzi do akceptacji as-built i potwierdzenia hurtowego
  (krok 2c); `Przy awarii` NIE jest objete akceptacja as-built - zawsze osobne pytanie, bo kod czesto
  w ogole tego nie obsluguje.

### Validate (numery dopisane na koncu, 1-16 bez zmian)
- **AC-SY7** 17 BLOCK: encja albo pole z dwoma masterami w SYSTEMS (dwa systemy zrodlem prawdy dla tego samego).
- **AC-SY8** 18 WARN: integracja (`zewnetrzny`/`reczny`) bez `Przy awarii` albo bez `Wlasciciel`.
- **AC-SY9** 19 WARN: integracja `Krytyczna = tak` bez sekcji `## Proces systemowy`.
- **AC-SY10** Brak `SYSTEMS.md` na poziomie `full` = 17-19 jako INFO "brak rejestru systemow" (nie BLOCK -
  istniejace projekty nie staja po aktualizacji pluginu); przy `light` pominiete.

### Panel
- **AC-SY11** Etap Domain liczy systemy (`counts.systems`) i pokazuje liste w szczegolach (jak encje):
  ID, system, status. Rejestr nie wplywa na status etapu Domain (gotowosc slownika zostaje kryterium).
- **AC-SY12** Zakladka Modul: liczba systemow i liczba integracji krytycznych w kafelkach liczb.
- **AC-SY13** Odcisk wymagan obejmuje `SYSTEMS.md` (juz dziala - `02-domain/*.md`); test potwierdza, ze zmiana
  pliku uniewaznia raport walidacji.

### Handover i dokumentacja
- **AC-SY14** Skill handover: zadanie integracyjne dostaje w opisie wiersz z SYSTEMS (wlasciciel, kierunek,
  przy awarii) i link do procesu systemowego; zachowanie przy awarii jako osobne AC w zadaniu.
- **AC-SY15** Przewodnik "Jak to dziala": SYSTEMS.md w folderach 02-domain, `S` w identyfikatorach,
  zdanie o mapie systemow i procesie systemowym.
- **AC-SY16** CLAUDE.md szablon: `S-xxx` w identyfikatorach.

### Intake i spec
- **AC-SY18** Skill intake: porownanie w przebiegu kolejnym obejmuje `02-domain/SYSTEMS.md` (zaraz po ENTITIES).
  Skill spec `--agent`: `plan.md` wskazuje tez, co odczytac z SYSTEMS (integracje funkcji).

### Demo
- **AC-SY17** Demo zlecenia: SYSTEMS.md z systemami z materialow (aplikacja zlecen, NBP - kurs sredni,
  system finansowy - limity, jesli wynikaja ze zrodel), raport walidacji z wierszami 17-19, demo nadal 100%.

## Czesc B: rodzaj modulu (`kind`) i kontrakt jako wymaganie (dopisane 2026-10-05, zatwierdzone)

### Problem
sdd-kit opisuje jedna rzecz: monolit albo jeden serwis. Wejscie i wyjscie (kontrakt) sa dzis tylko wierszem w
SYSTEMS.md - wiedza o otoczeniu, bez zrodla, AC, zatwierdzenia i kaskady. Dla serwisu kontrakt jest jego produktem,
dla monolitu dotyczy tylko integracji zewnetrznych. sdd-kit nie wie, z ktorym przypadkiem ma do czynienia,
a zgadywanie z kodu byloby zrodlem `[AI]` - nie mozna na nim stawiac wymogu "kontrakt obowiazkowy".

### Decyzja
Czlowiek deklaruje rodzaj modulu raz, w `SDD.yaml`:
```yaml
kind: monolith   # monolith | service
```
- `monolith` - aplikacja wdrazana w calosci; jej moduly rozmawiaja w kodzie (wspolna baza, wspolne obiekty),
- `service` - wdrazany osobno, z wlasnymi danymi, rozmawia z reszta tylko przez kontrakt.
Pytanie rozstrzygajace: "czy ta czesc jest wdrazana osobno i inne czesci moga z nia rozmawiac tylko przez kontrakt?"
Tak -> `service`. Klucz po angielsku jak pozostale (`level`, `owners`, `backlog`); w UI i pytaniach po polsku:
"monolit (aplikacja wdrazana w calosci)" / "serwis (wdrazany osobno, rozmawia przez kontrakt)".

Kontrakt = wymaganie `R` rodzaju **kontrakt** (wejscie albo wyjscie), z AC jezykiem biznesu: jakie dane (pojecia ze
slownika), kierunek, czestotliwosc / dopuszczalne opoznienie, zachowanie przy awarii (wiazace AC; kolumna
`Przy awarii` w SYSTEMS zostaje skrotem), przy `service` - zmiana wersji. Schemat techniczny (OpenAPI, AsyncAPI, pola,
endpointy) powstaje w budowie i wskazuje `R` - nie wchodzi do PRD. Kontrakt miedzy dwoma serwisami uzgadniaja
wlasciciele obu stron: `D` ze zrodlem `[Biz]`, nie odczyt z istniejacego kodu (docs/specs/decisions.md).

### Zachowanie zalezne od `kind`
| | `monolith` | `service` |
|---|---|---|
| Kontrakt dotyczy | integracji zewnetrznych z SYSTEMS | integracji zewnetrznych **i wlasnego API**: kto nas wola (wejscie), komu dajemy dane (wyjscie) |
| SYSTEMS.md | systemy, z ktorych bierzemy / do ktorych wysylamy | plus **konsumenci** serwisu (rola `konsument`); nieznany konsument = Q |
| validate 20 | WARN: integracja bez `R` kontraktu | **BLOCK**: integracja albo konsument bez `R` kontraktu; serwis bez zadnego `R` kontraktu wyjscia |
| interview | luka integracji | plus "kto korzysta z naszych danych", "co obiecujemy konsumentom przy awarii i zmianie wersji" |
| spec | `R` kontraktu dla integracji | `R` kontraktu dla kazdego wejscia i wyjscia; AC zmiany wersji (zmiana niekompatybilna wymaga...) |
| handover | test kontraktowy przy `R` kontraktu | test kontraktowy obowiazkowy; zadanie z `R` kontraktu bez testu kontraktowego sie nie zamyka |

### Poza zakresem (czesc B)
- porownanie `R` wyjscia dostawcy z `R` wejscia odbiorcy miedzy modulami - osobny etap,
- zbiorcza mapa systemow wszystkich modulow - osobny etap,
- wykrywanie `kind` z kodu jako decyzja - init moze tylko podpowiedziec.

### Kryteria akceptacji (czesc B)
- **AC-SY19** Szablon `SDD.yaml`: `kind: monolith   # monolith | service` z komentarzem; brak pola = `monolith`
  (projekty sprzed 0.31.0 bez zmian).
- **AC-SY20** `/sdd:init` pyta o rodzaj modulu pytaniem rozstrzygajacym; moze podpowiedziec z repo (np. openapi.yaml,
  osobny Dockerfile) jako sugestie `[AI]`, wybiera czlowiek.
- **AC-SY21** Panel, Konfiguracja: wybor rodzaju (monolit / serwis) zapisuje `kind` w `SDD.yaml`; zakladka Modul
  i naglowek panelu pokazuja rodzaj po polsku.
- **AC-SY22** Odcisk wymagan obejmuje `kind` - zmiana rodzaju uniewaznia walidacje i handover.
- **AC-SY23** `readProgress` / `moduleSummary` zwracaja `kind` (`monolith` domyslnie).
- **AC-SY24** SYSTEMS.md: kolumna `Wymagania` (`R` kontraktu; sciezka kaskady jak w RULES), rola `konsument`
  (przy `service`). Panel w liscie systemow pokazuje `R` kontraktu.
- **AC-SY25** Skill spec: rodzaj wymagania `kontrakt` (`Rodzaj: kontrakt - wejscie|wyjscie`, `System: S-xxx`)
  z obowiazkowymi AC: dane, kierunek, czestotliwosc/opoznienie, awaria; przy `service` dodatkowo zmiana wersji.
  Bez schematu technicznego.
- **AC-SY26** Skill validate: kontrola 20 - integracja (`zewnetrzny`/`reczny`, przy `service` tez `konsument`)
  bez `R` kontraktu w kolumnie `Wymagania`: WARN przy `monolith`, BLOCK przy `service`; `service` bez zadnego
  `R` kontraktu wyjscia: BLOCK. Kontrole 1-19 bez zmian.
- **AC-SY27** Skill interview: przy `service` pytania o konsumentow i obietnice przy awarii / zmianie wersji
  (regula luki integracji).
- **AC-SY28** Skill handover: `R` kontraktu -> test kontraktowy w tabeli sladowalnosci; przy `service` zadanie bez
  testu kontraktowego nie przechodzi do `done` (`/sdd:handover status ... done` odmawia bez testu w notce).
- **AC-SY29** Przewodnik "Jak to dziala" i CLAUDE.md: rodzaj modulu, kontrakt jako wymaganie, CO vs JAK kontraktu.
- **AC-SY30** Demo zostaje `monolith` (brak pola albo `kind: monolith`), raport z wierszem 20, nadal 100%.

## Testy (TDD, przed kodem)
- `board/test/systems.test.js`: AC-SY1..AC-SY4, AC-SY5..AC-SY6, AC-SY7..AC-SY10 (tresc skilli i szablonow),
  AC-SY11..AC-SY13 (`readProgress`, `moduleSummary`, odcisk na kopii projektu), AC-SY14..AC-SY17.
- czesc B: AC-SY19..AC-SY30 w tym samym pliku testow (SDD.yaml, odcisk, readProgress/moduleSummary, Konfiguracja,
  tresc skilli, demo).
- Recznie: na fv-manager `kind: monolith` w Konfiguracji, przebieg `/sdd:domain` + `/sdd:spec` (R kontraktu) (Home Assistant, ceny energii, falownik) - wynik do sekcji
  "Weryfikacja" w tym pliku.

## Rozstrzygniecia (2026-10-05, wlasciciel produktu)
1. `reczny` (Excel, mail) jest systemem, jesli niesie dane, ktorych master jest poza aplikacja - tak.
2. Kontrola 17 (dwa mastery) - BLOCK.
3. Karteczka `sys` na tablicy - etap 2, po weryfikacji na fv-manager.
4. sdd-kit opisuje monolit albo jeden serwis; rodzaj deklaruje czlowiek w `SDD.yaml` jako `kind: monolith | service`
   (nazwa klucza po angielsku jak pozostale), kontrakt to wymaganie `R` (czesc B).

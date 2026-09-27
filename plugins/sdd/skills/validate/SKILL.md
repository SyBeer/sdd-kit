---
name: validate
description: Kontrola jakosci wymagan - sprawdza zrodla, kryteria, testowalnosc, obalone zalozenia, zakwestionowane elementy modelu, pokrycie slownika i zrodel, sprzecznosci; raport z blokerami, ostrzezeniami i procentem gotowosci do budowy. Uzyj, gdy user mowi "sprawdz spec", "czy mozemy budowac", "validate", "gotowosc", przed handover.
---

# /sdd:validate

Etap 5. Piszesz sam, raport jest odtwarzalny.

## Checklista (kazdy punkt: PASS / WARN / BLOCK z lista pozycji)
1. BLOCK: R bez zrodla lub ze zrodlem `[AI]` bez A
2. BLOCK: R bez co najmniej jednego AC
3. BLOCK: R stojace na A `obalone`
4. BLOCK: Q ze statusem `sprzeczne`
5. BLOCK: Q z etykieta blokujaca ze statusem `otwarte` lub `zadane`
6. BLOCK: R stojace na elemencie modelu ze statusem `zakwestionowane` - pojecie z GLOSSARY
   uzyte w R, `BR` z pola `Reguly`, rola z ACTORS, stan lub przejscie z ENTITIES.
   Sciezka jak w punkcie 3: element podmyty przez zrodlo wyzsze w hierarchii uniewaznia
   wszystko, co na nim stoi, dopoki czlowiek nie rozstrzygnie.
7. WARN: AC nietestowalne (brak konkretnego stanu / zdarzenia / obserwowalnego wyniku, slowa "odpowiednio", "szybko", "intuicyjnie")
8. WARN: R z A `niepotwierdzone` ze zrodlem `[Dok]` lub `[AI]`
9. WARN: pojecie uzyte w PRD, ktorego nie ma w GLOSSARY
10. WARN: **zrodlo przeczytane i nieuzyte** - pozycja w `00-intake/INDEX.md` ze statusem
    zrodla `aktualne`, ktorej nazwa pliku nie wystepuje w zadnym `Zrodlo` w GLOSSARY,
    ACTORS, RULES, ASSUMPTIONS, DECISIONS ani PRD. To jedyna kontrola na wymaganie, ktore
    zniknelo bez sladu: nie zostawia sprzecznosci ani pytania, wiec nic innego go nie lapie.
    Zrodlo o statusie innym niz `aktualne` pomijasz - dlatego status musi byc uzupelniony.
    WARN, nie BLOCK: na wczesnym etapie wiekszosc zrodel jeszcze nie jest uzyta i bloker
    swiecilby stale, a stale swiecacy bloker przestaje byc czytany.
11. WARN: D bez wypelnionego "Powod"
12. WARN: R `zatwierdzone` w sekcji "Do przegladu" (zatwierdzone, ale dotkniete zmiana)
13. INFO: A `niepotwierdzone` ze zrodlem `[App]`
14. INFO: Q `zaparkowane` bez warunku (to tez blad procesu, popraw)
15. INFO: element modelu (pojecie, `BR`) ktorego nie cytuje zadne R - sierota w druga strone,
    albo model wyprzedza spec, albo wymaganie wypadlo.

Jesli w projekcie dostepny jest skill `spec-checker`, odpal go na `03-spec/agent/*/spec.md` i dolacz wynik.

## Raport
`04-validation/validate-YYYY-MM-DD.md`: tabela wynikow, lista blokerow z odnosnikami, lista ostrzezen, wskaznik:
gotowosc = (R zatwierdzone bez BLOCK i bez WARN 7-8) / (wszystkie R w zakresie) w %.
Na koncu: 3 najwazniejsze rzeczy do zrobienia, zeby podniesc gotowosc.
Pod linia z gotowoscia wpisz odcisk wymagan, liczony na koncu przebiegu (po wszystkich poprawkach):
`node "${CLAUDE_PLUGIN_ROOT}/board/fingerprint.js" requirements` -> linia `Odcisk wymagan: sha256:<hex>`.
Panel porownuje go z biezacym stanem plikow: kazda zmiana wymagan po walidacji oznacza raport jako nieaktualny
i cofa aktualny krok na /sdd:validate. Bez tej linii panel ocenia raport tylko po kolejnosci wpisow w CHANGELOG.

## Na koniec
CHANGELOG + wypisz gotowosc i liczbe blokerow. Nie powtarzaj calego raportu na ekranie.

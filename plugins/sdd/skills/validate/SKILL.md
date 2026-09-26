---
name: validate
description: Kontrola jakosci wymagan - sprawdza zrodla, kryteria, testowalnosc, obalone zalozenia, pokrycie slownika, sprzecznosci; raport z blokerami, ostrzezeniami i procentem gotowosci do budowy. Uzyj, gdy user mowi "sprawdz spec", "czy mozemy budowac", "validate", "gotowosc", przed handover.
---

# /sdd:validate

Etap 5. Piszesz sam, raport jest odtwarzalny.

## Checklista (kazdy punkt: PASS / WARN / BLOCK z lista pozycji)
1. BLOCK: R bez zrodla lub ze zrodlem `[AI]` bez A
2. BLOCK: R bez co najmniej jednego AC
3. BLOCK: R stojace na A `obalone`
4. BLOCK: Q ze statusem `sprzeczne`
5. BLOCK: Q z etykieta blokujaca ze statusem `otwarte` lub `zadane`
6. WARN: AC nietestowalne (brak konkretnego stanu / zdarzenia / obserwowalnego wyniku, slowa "odpowiednio", "szybko", "intuicyjnie")
7. WARN: R z A `niepotwierdzone` ze zrodlem `[D]` lub `[AI]`
8. WARN: pojecie uzyte w PRD, ktorego nie ma w GLOSSARY
9. WARN: D bez wypelnionego "Powod"
10. WARN: R `zatwierdzone` w sekcji "Do przegladu" (zatwierdzone, ale dotkniete zmiana)
11. INFO: A `niepotwierdzone` ze zrodlem `[P]`
12. INFO: Q `zaparkowane` bez warunku (to tez blad procesu, popraw)

Jesli w projekcie dostepny jest skill `spec-checker`, odpal go na `03-spec/agent/*/spec.md` i dolacz wynik.

## Raport
`04-validation/validate-YYYY-MM-DD.md`: tabela wynikow, lista blokerow z odnosnikami, lista ostrzezen, wskaznik:
gotowosc = (R zatwierdzone bez BLOCK i bez WARN 6-7) / (wszystkie R w zakresie) w %.
Na koncu: 3 najwazniejsze rzeczy do zrobienia, zeby podniesc gotowosc.

## Na koniec
CHANGELOG + wypisz gotowosc i liczbe blokerow. Nie powtarzaj calego raportu na ekranie.

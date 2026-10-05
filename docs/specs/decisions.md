# Decyzje tylko ze zrodla [Biz] (zmiana 0.30.1)

## Problem
Model czyta kod (`[App]`) albo dokumentacje (`[Dok]`) i zapisuje znaleziony fakt jako decyzje biznesu `D-xxx`
("limit 5000 zl, bo tak jest w kodzie"). `[App]`/`[Dok]` mowia, jak jest, nie ze biznes tak chce.
`D` jest na szczycie: kolejne zrodla sprawdza sie z nia (intake: trafienie w `D` = najciezsza klasa),
wiec blad z kodu utrwala sie jako prawda, ktorej nikt juz nie kwestionuje.
Zgoda czlowieka na propozycje wpisu nie zastepuje zrodla - wpis bez slow biznesu nadal nie jest decyzja biznesu.

## Cel
1. `D` powstaje tylko ze slow biznesu (`[Biz]`). To, co wynika z aplikacji, dokumentu albo wniosku AI,
   idzie do `A` `niepotwierdzone` z tym zrodlem i wraca do biznesu jako pytanie potwierdzajace.
2. Bez zasypywania biznesu pytaniami: potwierdzenie hurtowe (jedna lista w rundzie) i jedna decyzja
   "akceptacja as-built" dla istniejacej aplikacji.

## Poza zakresem
- Kontrola, czy `Zdecydowal` jest rola z `SDD.yaml owners` - `owners` to role zatwierdzajace,
  a decyzje podejmuja tez inne role biznesu (demo: team leader). Odrzucone.
- Zmiany w panelu: blokada przychodzi z raportu walidacji jak kazdy BLOCK (gotowosc, blokery).

## Kryteria akceptacji
- **AC-DE1** `templates/CLAUDE.md` (sekcja 2 i zakazy): `D` tylko ze zrodla `[Biz]`; z `[App]`/`[Dok]`/`[AI]`
  powstaje `A` `niepotwierdzone`; zgoda na wpis nie zastepuje zrodla.
- **AC-DE2** Szablon `DECISIONS.md`: pole `Zrodlo` oznaczone jako obowiazkowe `[Biz]` z nazwa pliku.
- **AC-DE3** Skill validate: kontrola 16 BLOCK "D bez zrodla [Biz]" (stare `[B]` liczy sie jak `[Biz]`);
  numery 1-15 bez zmian (panel czyta wiersz 9 po numerze).
- **AC-DE4** Skill interview: `D` tylko z odpowiedzi biznesu; sciezki "potwierdzenie hurtowe"
  i "akceptacja as-built" (jedna `D` `[Biz]`, na ktora powoluja sie `A` z `[App]`).
- **AC-DE5** Skill intake: klasa `zamyka Q` proponuje `D` tylko przy zrodle `[Biz]`; inne zrodla -> `A`.
- **AC-DE6** Skill domain nie tworzy `D`; fakt z kodu bez slow biznesu -> `A` `niepotwierdzone`.
- **AC-DE7** Demo: kazda `D` ma zrodlo `[Biz]`, raport walidacji ma wiersz 16 PASS; demo nadal 100%.
- **AC-DE8** Przewodnik "Jak to dziala" (info.js, sekcja zrodel): decyzja tylko ze slow biznesu.

## Testy
`plugins/sdd/board/test/decisions.test.js` - AC-DE1..AC-DE8 (tresc skilli/szablonow, dane demo).

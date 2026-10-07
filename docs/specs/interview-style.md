# Spec: styl rozmowy wywiadu BIZ / INZ (zmiana 0.37.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-07: "tak, buduj jako 0.37.0, BIZ domyslnie, ale daj tez przelacznik").

## Problem
Analiza sesji `/sdd:interview` na fv-manager (Q-024..Q-030, 2026-10-04): rozmowa czyta sie jak dokumentacja.
Kazde pytanie ma naglowek "Pytanie N z 7 (Q-0xx): …", punkty z kodu z numerami BR/A/D i stopke "Zarejestruj kto
udzielil odpowiedzi"; kazda odpowiedz dostaje 5-punktowy formularz (Rodzaj, Tresc, Status, Zrodlo, Kaskada) - tak samo
przy odpowiedzi banalnej i przelomowej. User (2026-10-07): "sa bardzo sztywne i trudne do czytania ... bardziej
nieformalna rozmowa, tak zeby nie wygladalo jak czytanie dokumentacji ... bez zbednych ozdobnikow".

## Cel
Wywiad w stylu **BIZ** brzmi jak rozmowa, bez utraty jakosci: w plikach to samo co dzis (autor, zrodlo `[Biz]`, kaskada,
potwierdzenie przed zapisem). Styl **INZ** zostaje dla tych, ktorzy wola pelne wpisy.

Metryka: odpowiedz po pytaniu w stylu BIZ miesci sie w 1-3 zdaniach, gdy nic sie nie dzieje (brak nowej D,
sprzecznosci, kaskady na R).

## Jak
- `SDD.yaml`: `interview_style: biz | inz` (brak pola = `biz`). Szablon i nowe moduly: `biz`.
- Konfiguracja: przelacznik segmentowy "Styl rozmowy: BIZ / INŻ" (jak Backlog i Rodzaj modulu).
- Na jedna rozmowe: `/sdd:interview live biz|inz`; w trakcie: "przejdz na BIZ" / "przejdz na INZ".
- Dotyczy `/sdd:interview live` i tur warsztatu `/sdd:board`. Rundy async (pliki dla biznesu) bez zmian.

## Styl BIZ (zasady dla skilla)
1. Autor raz na poczatku ("Rozmawiam z Toba jako <rola>, tak?"); dalej pytasz tylko, gdy zmienia sie rozmowca.
2. Pytanie: jedno-dwa zdania kontekstu jezykiem rozmowcy + pytanie. Bez naglowkow, punktow, numerow pytan, nazw plikow
   i wersji kodu; ID tylko dopiskiem na koncu, np. "(Q-027)". Postep od czasu do czasu ("zostaly jeszcze dwa").
3. Po odpowiedzi: parafraza i propozycja zapisu w 1-2 zdaniach ("Czyli … Zapisuje jako potwierdzone, ok?").
   Pelny wpis (rodzaj, tresc, kaskada) tylko gdy cos sie dzieje: nowa decyzja D, sprzecznosc, obalenie A, zmiana
   dotyka R. Kaskade i tak liczysz i zapisujesz w plikach.
4. Potwierdzenie zapisu i nastepne pytanie w jednej wiadomosci ("Zapisane. Teraz o …").
5. Regula z kodu (as-built) - proste "tak ma zostac?" albo zbiorcze potwierdzenie; pytania o przeszlosc tam,
   gdzie odkrywasz, jak rozmowca naprawde pracuje.
6. "Nie wiem" / "nie dotyczy mnie" - od razu propozycja odlozenia z warunkiem, bez dodatkowej rundy.

## Styl INZ
Jak przed 0.37.0 (naglowek pytania, fakty z kodu z numerami, pelny wpis po odpowiedzi) - z jedna zmiana z BIZ:
autor raz na poczatku (punkt 1).

## Kryteria akceptacji
- **AC-IS1** `info.js`: `STYLES = ['biz','inz']`; `yamlSet(text, {interview_style})` - walidacja wartosci; brak linii -
  wstawiona pod `kind` (albo `level`) z komentarzem jak w szablonie.
- **AC-IS2** Serwer: `/api/config` -> `sdd.interviewStyle` (brak pola = `biz`), `sdd.stylesAllowed`; zapis
  `interview_style` dozwolony (CHANGELOG modulu jak przy innych polach). Odcisk walidacji bez zmian (pole nie wplywa).
- **AC-IS3** Konfiguracja: przelacznik `#f-style` (BIZ / INŻ) z podpowiedzia skutku; zapis jak pozostale pola.
- **AC-IS4** Szablon `SDD.yaml`: `interview_style: biz` z komentarzem; `/sdd:init` - bez pytania (domyslnie biz).
- **AC-IS5** Skill `interview`: sekcja "Styl rozmowy" - odczyt `interview_style` (domyslnie biz), argument `biz|inz`,
  "przejdz na …", zasady BIZ 1-6 i INZ, przyklad BIZ; autor raz na poczatku w obu stylach.
- **AC-IS6** Skill `board` (tura warsztatu): ten sam styl z `SDD.yaml`, odeslanie do zasad w skillu `interview`.
- **AC-IS7** Przewodnik: wariant `/sdd:interview live inz` w komendach, zdanie o stylu w sekcji Konfiguracji/wywiadu.
- **AC-IS8** (reczne) rozmowa BIZ na fv-manager: pytania i potwierdzenia jak w przykladzie z 2026-10-07; pliki jak w INZ.

- **AC-IS9** (0.38.1, uwaga usera: "dlaczego tak skomplikowanie odpowiedziales ... uprosc. Jezeli uzytkownik bedzie chcial,
  dopyta"): w BIZ takze nowa decyzja D jednym-dwoma zdaniami ("Czyli przyjmujemy: … Zapisuje?"); pelny wpis (rodzaj, tresc,
  powod, kaskada) tylko na prosbe.
- **AC-IS10** Nowe pytania odlozone na pozniej, kaskada i numery - zapisywane bez komentarza; sprzecznosc / obalenie -
  jednym zdaniem i pytanie, ktora wersja prawdziwa.
- **AC-IS11** Wznowiona rozmowa: odpowiedz jest juz w `session-*.md` - bez powtarzania pytania, od razu propozycja zapisu.

- **AC-IS12** (0.39.0, uwaga usera: "nie strasz liczba pytan albo pracy do zrobienia. zapytaj na poczatku ile czasu
  uzytkownik ma na rozmowe (pokaz zegar) i z listy tematow - zrob najpierw najwazniejsze i staraj sie zmiescic w czasie"):
  BIZ na starcie pyta "Ile masz dzis czasu na rozmowe?"; nie podaje liczby pytan, zalozen ani listy do przejscia.
- **AC-IS13** Tematy na dzis jednym zdaniem od najwazniejszego (sprzeczne, blokujace go-live najpierw); start i czas w sesji
  (`date`); przed kolejnym pytaniem kontrola czasu - ok. 5 min przed koncem zamkniecie tematu, zapis, krotkie podsumowanie
  i "Na nastepny raz zostalo: …"; bez odpowiedzi o czas - 30 min.
- **AC-IS14** INZ bez zmian: na start liczba pytan i kolejnosc.

## Przyklad BIZ (z sesji fv-manager, Q-027)
> Teraz o zwrocie z inwestycji. Aplikacja pokazuje „pozostało do zwrotu”: inwestycja minus oszczędności z domu
> i z ładowania auta. Kiedy ostatnio liczyłeś, w jakim stopniu instalacja już się zwróciła, to co brałeś pod uwagę? (Q-027)

Po odpowiedzi "inwestycje - oszczednosci z domu i EV":
> Czyli tak samo jak aplikacja - EV to tylko ładowanie domowe. Zapisuję jako potwierdzone; liczba miesięcy do zwrotu
> zostaje na później. Ok?

## Testy (TDD, przed kodem)
`board/test/interview-style.test.js`: AC-IS1..AC-IS7.

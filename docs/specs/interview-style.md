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
   i wersji kodu; ID tylko dopiskiem na koncu, np. "(Q-027)". Bez licznika pytan (0.39.0, 0.40.0).
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

- **AC-IS15** (0.39.1, uwaga usera: "Mozna to inaczej podsumowywac? np. 'Czyli … Nie musisz ich miec w obliczeniach?'
  Tu w zaleznosci od odpowiedzi - TAK - zapisujesz decyzje - NIE lub inna odpowiedz - dopytujesz"): parafraza jest pytaniem
  i zgoda na zapis; "tak" -> zapis bez komentarza i nastepne pytanie; "nie" / inna odpowiedz -> dopytanie, bez zapisu.

- **AC-IS16** (0.39.2, uwaga usera: "jak czas sie skonczy to - nie przerywasz raptownie ... nie ty decydujesz tylko rozmowca.
  Mowisz ile pytan zostalo. Jezeli ciagniecie dalej rozmowe to ile jeszcze czasu potrzebujesz"): biezace pytanie konczone
  do zapisu; ok. 2 min przed koncem albo po czasie - jedna wiadomosc: czas minal, N pytan zostalo (z tematami), ok. M minut
  (pozostale x tempo rozmowy, min. 2 min/pytanie, w gore do 5), "Kontynuujemy czy konczymy na dzis?"; bez odpowiedzi
  nowego pytania nie zaczyna; kontynuacja -> nowy czas M w sesji; koniec -> zapis i "Na nastepny raz zostalo: …".
  Zastepuje samodzielne zamykanie z AC-IS13.

- **AC-IS17** (0.40.0, uwaga usera po Q-052/Q-053 na fv-manager: "jak mam dobrej jakosci odpowiedz to po co powtarzac"):
  odpowiedz jasna i pelna -> zapis od razu (zrodlo `[Biz]` z sesji) i jedno zdanie potwierdzenia razem z nastepnym pytaniem
  ("Zapisane – aplikacja operatora ładowarki to drugie ręczne źródło. Teraz o …"); parafraza-pytanie z AC-IS15 tylko
  z powodem: odpowiedz niejasna / niepelna / wieloznaczna, interpretacja wychodzi poza slowa rozmowcy, nowa D,
  sprzecznosc albo obalenie A. Porzadek w plikach (rejestr systemow, nowe Q, kaskada) nie jest powodem do pytania.
  Bez "Ok?" / "Zapisuje?" i bez licznika ("ostatnie pytanie"). Wznowiona rozmowa: jasna odpowiedz z sesji - zapis
  i jedno zdanie. Krok 3 skilla: wyjatek BIZ od "czekaj na tak".

## Przyklad BIZ (z sesji fv-manager, Q-027)
> Teraz o zwrocie z inwestycji. Aplikacja pokazuje „pozostało do zwrotu”: inwestycja minus oszczędności z domu
> i z ładowania auta. Kiedy ostatnio liczyłeś, w jakim stopniu instalacja już się zwróciła, to co brałeś pod uwagę? (Q-027)

Po odpowiedzi "inwestycje - oszczednosci z domu i EV":
> Czyli tak samo jak aplikacja - EV to tylko ładowanie domowe. Zapisuję jako potwierdzone; liczba miesięcy do zwrotu
> zostaje na później. Ok?

## Testy (TDD, przed kodem)
`board/test/interview-style.test.js`: AC-IS1..AC-IS7.

# Spec: eksport Tablicy do PDF jako jedna duza strona (zmiana 0.35.0)

Status: **zatwierdzone** (wlasciciel produktu, 2026-10-06: "Potrzebuje miec mozliwosc wyeksportowac tablice do jednego
wielkiego PDF nie w formacie kartek", propozycja przyjeta: "tak, buduj jako 0.35.0").

## Problem
Tablicy warsztatowej nie da sie wyniesc poza panel - po warsztacie biznes chce ja zobaczyc w calosci (mail, archiwum,
druk wielkoformatowy). Zwykly wydruk przegladarki tnie ja na kartki A4 i pokazuje tylko widoczny fragment.

## Cel
Jeden przycisk na Tablicy daje PDF z cala tablica na **jednej stronie** o rozmiarze tablicy.

Metryka: cala tablica (wszystkie procesy i kolumny) w jednym pliku PDF jednym kliknieciem + "Zapisz jako PDF".

## Jak
Przycisk "PDF" w pasku narzedzi Tablicy otwiera **nowe okno** (karte) z ta sama tablica w trybie eksportu
(`/board?pdf=1`, uwaga usera: "wydruk powinien pojawiac sie w nowym oknie") i tam okno drukowania przegladarki:
rozmiar strony (`@page size`) liczony z wymiarow calej tablicy w skali 100%, bez marginesow. User wybiera
"Zapisz jako PDF". Bez zaleznosci npm i bez generowania PDF na serwerze (kit dziala bez npm).

## Zakres
- PDF zawiera: naglowek (nazwa modulu, tytul tablicy, data i godzina eksportu, legenda typow karteczek) oraz
  wszystkie procesy i kolumny z karteczkami - kolory typow, znaczki stanu plikow, ID, autor i data, pelny tekst
  karteczki i odpowiedzi (bez ucinania jak na ekranie).
- Bez elementow pracy: pasek stanu, naglowek, pasek narzedzi, panel karteczki, okno Claude, przyciski "+", strzalki
  procesow, strefy wstawiania, komunikaty.
- Zawsze jasne kolory (takze przy ciemnym motywie), kolory tla drukowane (`print-color-adjust: exact`).
- Skala 100% niezaleznie od powiekszenia na ekranie; okno z praca zostaje nietkniete (motyw, powiekszenie,
  przewiniecie, edycja), okno eksportu nie zmienia zapisanego powiekszenia i nie podlacza okna Claude.
- Ukryte pytania ("Ukryj") zostaja ukryte w PDF - eksport pokazuje to, co wybrano na ekranie.
- Dziala tez w demo (to odczyt). Na telefonie przycisku nie ma.

## Poza zakresem
- PDF generowany przez serwer niezaleznie od przegladarki (polskie znaki i czcionki w PDF - duzo pracy),
- Safari: moze dalej dzielic na kartki (slabo obsluguje `@page size`) - Chrome / Edge sa docelowe,
- eksport PNG / SVG.

## Kryteria akceptacji
- **AC-BP1** Pasek narzedzi Tablicy ma przycisk `#pdf` "PDF" (title: "Eksport całej tablicy do PDF - jedna strona");
  ukryty na telefonie (<= 640 px) i na pustej tablicy (brak procesow).
- **AC-BP2** `boardPageSize(w, h)` (board-ops.js): rozmiar strony w px z wymiarow tresci + margines 24 px z kazdej strony,
  zaokraglony w gore; minimum 400 x 300; CSS `@page{size:<w>px <h>px;margin:0}`.
- **AC-BP3** Klik "PDF" otwiera nowe okno `<sciezka tablicy>?pdf=1`. W tym oknie po wczytaniu tablicy: jasny motyw,
  powiekszenie 100% bez zapisu, klasa `printing` na `<html>`, styl `@page` z AC-BP2 (liczony w ukladzie eksportu, odswiezany
  przy zmianie tablicy), tytul karty z dopiskiem "– PDF", `window.print()` raz - po zaladowaniu czcionek. Okno eksportu
  nie otwiera okna Claude. Okno z praca bez zmian.
- **AC-BP4** `@media print`: ukryte elementy pracy (lista w Zakresie); tablica bez przewijania i bez przyklejonych
  elementow (nazwy procesow, linijka kolumn - zwykle polozenie); pelny tekst karteczki (bez `max-height`) i odpowiedzi
  (bez ucinania do 2 linii); `print-color-adjust: exact`.
- **AC-BP5** Naglowek eksportu `#printhead` (widoczny tylko w druku): nazwa modulu, tytul tablicy, "eksport RRRR-MM-DD GG:MM",
  legenda typow (zdarzenie, komenda, kto, regula, widok, nie wiemy) i stanow plikow (w plikach, zmienione, tylko na tablicy,
  brak w pliku).
- **AC-BP6** (reczne) Chrome: PDF jednostronicowy, rozmiar strony = cala tablica, tekst zaznaczalny, kolory jak na ekranie
  w jasnym motywie; przy ciemnym motywie i powiekszeniu 75% wynik ten sam, okno z praca bez zmian.

## Weryfikacja
- 2026-10-06, Chrome bez okna (DevTools `Page.printToPDF` z `preferCSSPageSize`, jak "Zapisz jako PDF"): demo
  `/demo/board?pdf=1` - okno drukowania wywolane raz, motyw jasny, 1 strona 1852x1313 px; fv-manager - 1 strona
  3094x2500 px, polskie znaki w tekscie PDF. Pierwsza wersja (pomiar na ekranie) dawala 2 strony - pelny tekst karteczek
  jest wyzszy niz na ekranie; stad pomiar w ukladzie eksportu.

## Testy (TDD, przed kodem)
`board/test/board-pdf.test.js`: AC-BP1 (przycisk, ukrycie), AC-BP2 (`boardPageSize`), AC-BP3 (nowe okno, tryb eksportu),
AC-BP4 (reguly `@media print`), AC-BP5 (naglowek i legenda).

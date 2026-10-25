# Styl BIZ - swobodna rozmowa

Cel: rozmowa ma brzmiec jak rozmowa z czlowiekiem, nie jak czytanie dokumentacji. Rozmowca widzi tylko zwykle zdania;
pliki (sesja, D, A, Q, kaskada, CHANGELOG) zapisujesz tak samo jak w INZ.

1. **Pytanie**: jedno-dwa zdania kontekstu jezykiem rozmowcy (tak, jak on nazywa rzeczy), potem pytanie - zwykla
   mowa, jak w rozmowie twarza w twarz. Naglowki, punkty, pogrubienia, numery pytan, nazwy plikow, wersje kodu
   i numery BR/A/D zostaja w plikach. ID pytania tylko dopiskiem na koncu: "(Q-027)".
2. **Czas zamiast liczby pytan**. Na starcie, razem z pytaniem o autora: "Ile masz dzis czasu na rozmowe?".
   Zapisz godzine startu (`date`) i deklarowany czas w sesji. Potem jednym zdaniem tematy na dzis od najwazniejszego
   (sprzeczne i blokujace go-live najpierw), zwyklymi slowami: "Zaczne od cen pradu, potem okresy rozliczeniowe."
   Nie podajesz liczby pytan, zalozen ani "listy do przejscia" - rozmowca ma czuc temat, nie ilosc pracy. Brak
   odpowiedzi o czas ("nie wiem", "ile trzeba") - przyjmij 30 minut.
3. **Koniec czasu - decyduje rozmowca.** Nie przerywasz w polowie tematu: konczysz biezace pytanie (zapis), a przed
   kolejnym sprawdzasz `date`. Gdy zostaly ok. 2 minuty albo czas minal - jedna wiadomosc:
   "Czas, który mieliśmy, minął. Zostały jeszcze <N> pytania (<tematy>) – potrzebowałbym około <M> minut.
   Kontynuujemy czy kończymy na dziś?". Tu (i tylko tu) podajesz liczbe pytan. M = pozostale pytania x srednie tempo
   tej rozmowy (minuty od startu / liczba omowionych pytan; co najmniej 2 min na pytanie), zaokraglone w gore do 5.
   - kontynuujemy -> nowy czas M (zapisz w sesji), dalej jak wczesniej; po nim ta sama wiadomosc jeszcze raz,
   - konczymy -> zapis, krotko, co udalo sie ustalic, i "Na nastepny raz zostalo: <tematy>",
   - nowe pytanie zaczynasz dopiero po odpowiedzi rozmowcy.
4. **Po odpowiedzi** - wg tabeli w kroku 3 skilla. Cel: rozmowca nie slyszy drugi raz tego, co juz jasno powiedzial.
   - Odpowiedz jasna i pelna -> zapisujesz od razu (zrodlo `[Biz]` z sesji) i w jednej wiadomosci: jedno krotkie
     zdanie, co zapisales, plus nastepne pytanie: "Zapisane – <co>. Teraz o …".
   - Parafraza jest pytaniem tylko, gdy jest powod: odpowiedz niejasna, niepelna albo wieloznaczna; Twoja interpretacja
     wychodzi poza to, co rozmowca powiedzial; z odpowiedzi powstaje nowa decyzja D. Wtedy w 1-2 zdaniach, jak
     zrozumiales, ze znakiem zapytania na koncu - to jest zgoda na zapis:
     - "tak" (albo "zgadza sie", "dokladnie") -> zapisujesz D albo A bez komentarza i od razu nastepne pytanie,
     - "nie" albo inna odpowiedz -> dopytujesz jednym zdaniem, czego nie zrozumiales; zapisu jeszcze nie ma.
   - Wyjatek - sprzecznosc z wczesniejsza decyzja albo obalenie zalozenia: jednym zdaniem, co sie nie zgadza, i pytanie,
     ktora wersja jest prawdziwa.
   - To, co jest tylko porzadkiem w plikach (rejestr systemow, nowe Q na pozniej, kaskada, numery), nie jest powodem do
     pytania. Nowe pytania odlozone na pozniej, kaskade i numery zapisujesz bez komentarza, najwyzej wspominasz
     w zdaniu potwierdzenia.
   - Pytaniem jest sama parafraza albo nie ma pytania - dopiski "Ok?", "Zapisuje?", "robie z tego decyzje" sa zbedne.
   - Powod bierzesz ze slow rozmowcy. Pelny wpis (rodzaj, tresc,
     powod, kaskada) pokazujesz tylko na prosbe ("szczegoly?", "co to zmienia?").
5. **Przejscie dalej** jednym zdaniem: "Zapisane. Teraz o …" - zwykle "Teraz o …", bez stanu Q/A i bez licznika
   ("ostatnie pytanie", "jeszcze dwa").
6. **Regula odczytana z kodu** (stan dzisiejszy, as-built): wystarczy proste "tak ma zostac?" albo lista do potwierdzenia
   hurtowego (krok 2c). Pytania o przeszlosc zostaw na miejsca, gdzie odkrywasz, jak rozmowca naprawde pracuje.
7. **"Nie wiem" / "nie dotyczy mnie"** -> od razu jedno zdanie z propozycja odlozenia z warunkiem (krok 2a, punkt 6).
8. Wznowiona rozmowa: odpowiedz juz jest w `01-interview/session-*.md` - nie pytasz drugi raz; jasna -
   zapis i jedno zdanie ("Z poprzedniej rozmowy mam: … – zapisane."), niejasna - parafraza jako pytanie (punkt 4). Sprawdzasz to przed kazdym pytaniem po wznowieniu.
9. Mowisz tylko to, co ma przeczytac rozmowca - panel czatu pokazuje Twoje dzialania (odczyt, zapis) sam.

## Przyklad (fv-manager, Q-027)
Pytanie:
> Teraz o zwrocie z inwestycji. Aplikacja pokazuje „pozostało do zwrotu”: inwestycja minus oszczędności z domu
> i z ładowania auta. Kiedy ostatnio liczyłeś, w jakim stopniu instalacja już się zwróciła, to co brałeś pod uwagę? (Q-027)

Odpowiedz "inwestycje - oszczednosci z domu i EV" - interpretacja ("tylko ladowanie domowe") wychodzi poza slowa
rozmowcy, wiec parafraza jako pytanie:
> Czyli liczysz tak samo jak aplikacja, a EV to tylko ładowanie domowe? (Q-027)

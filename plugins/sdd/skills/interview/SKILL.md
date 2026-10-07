---
name: interview
description: Prowadzi wywiad z biznesem - generuje pytania z luk, pustych powodow, zalozen bez zrodla i sprzecznosci; zapisuje odpowiedzi jako decyzje lub zalozenia i wypisuje kaskade wplywu. Tryby live (warsztat) i async (rundy w plikach). Uzyj, gdy user mowi "dopytaj", "przygotuj pytania", "wywiad", "runda pytan", "wklejam odpowiedzi", "co jeszcze nie wiemy".
---

# /sdd:interview

Etap 2. Zamieniasz surowiec w rozstrzygniecia przez pytania, nie zgadywanie.

## Wejscie
`00-intake/INDEX.md`, `01-interview/QUESTIONS.md`, `ASSUMPTIONS.md`, `DECISIONS.md`, jesli istnieja: `02-domain/*`, `03-spec/PRD.md`.

## Krok 1: generowanie pytan (zawsze, w kazdym trybie)
Piec regul. Kazde pytanie ma w kolumnie "Skad" nazwe reguly i odnosnik.
1. **Luka**: proces, encja lub regula wspomniana w surowcu, ale bez opisu zachowania (co sie dzieje w wyjatku, kto moze, kiedy).
2. **Pusty powod**: decyzja D bez wypelnionego "Powod" albo z powodem oznaczonym `[AI]` (wniosek prowadzacego) -> pytanie "dlaczego".
3. **Zalozenie bez biznesu**: A ze zrodlem `[App]`, `[Dok]` lub `[AI]` -> pytanie potwierdzajace.
4. **Sprzecznosc**: wiersze `sprzeczne` w QUESTIONS.md -> pytanie "ktore prawdziwe" z cytatami obu zrodel.
5. **Luka integracji**: system albo przeplyw danych w surowcu lub w `02-domain/SYSTEMS.md` bez wlasciciela, kierunku,
   czestotliwosci albo zachowania przy awarii -> pytanie o przeszlosc ("co sie stalo ostatnio, gdy <system> nie odpowiadal",
   "skad wzieliscie <dane>, gdy ich zabraklo"). Adresat: wlasciciel integracji, a bez niego wlasciciel procesu.
   Przy `kind: service` w SDD.yaml dodatkowo: kto korzysta z danych serwisu (konsument), co obiecujemy konsumentom
   przy awarii i przy zmianie wersji ("co sie stalo ostatnio, gdy zmienilismy dane, ktore ktos od nas bral").

Zasady formulowania:
- o przeszlosc, nie hipotezy: "co zrobiles ostatnio, gdy..." zamiast "czy chcialbys..."
- otwarte, nie tak/nie
- jedno pytanie = jedna rzecz
- nigdy nie sugeruj odpowiedzi
- drazysz wyjatki i obejscia ("a co, gdy...", "jak to obchodzicie dzis")
- sprawdzasz: jednorazowka czy wzorzec ("ile razy w miesiacu")

Priorytet: sprzeczne > otwarte z etykieta blokujaca > reszta. Grupuj per adresat (rola).

## Styl rozmowy (BIZ / INZ)
Dotyczy rozmowy na zywo (`live`) i tur warsztatu `/sdd:board`. Pliki (sesja, D, A, Q, kaskada, CHANGELOG) w obu stylach
sa takie same - styl zmienia tylko to, co user czyta na ekranie (0.37.0, docs/specs/interview-style.md).
- Rozmowa w panelu sdd-board (0.38.0): okno czatu panelu = BIZ, terminal panelu = INZ - panel dopisuje to w instrukcji
  startowej i ma to pierwszenstwo przed `interview_style`.
- Styl bierzesz z `interview_style` w `SDD.yaml`; brak pola = domyslnie `biz`. Argument nadpisuje na te rozmowe:
  `/sdd:interview live biz`, `/sdd:interview live inz`. W trakcie: "przejdz na BIZ" / "przejdz na INZ" - od nastepnego pytania.
- **Autor raz na poczatku** (oba style): "Rozmawiam z Toba jako <rola z SDD.yaml>, tak?". Dalej kazda odpowiedz ma tego
  autora; pytasz ponownie tylko, gdy user powie, ze odpowiada ktos inny. Nie dopisuj pod pytaniami prosby o autora.

**BIZ - swobodna rozmowa (domyslnie)**. Ma brzmiec jak rozmowa z czlowiekiem, nie jak czytanie dokumentacji. Bez ozdobnikow.
1. Pytanie: jedno-dwa zdania kontekstu jezykiem rozmowcy (tak, jak on nazywa rzeczy), potem pytanie. Bez naglowkow,
   punktow, pogrubien, numerow pytan, nazw plikow, wersji kodu i numerow BR/A/D w tresci. ID tylko dopiskiem na koncu: "(Q-027)".
2. Czas zamiast liczby pytan (0.39.0). Na starcie, razem z pytaniem o autora: "Ile masz dzis czasu na rozmowe?".
   Zapisz godzine startu (`date`) i deklarowany czas w sesji. Potem jednym zdaniem tematy na dzis od najwazniejszego
   (sprzeczne i blokujace go-live najpierw), zwyklymi slowami: "Zaczne od cen pradu, potem okresy rozliczeniowe."
   Nie podajesz liczby pytan, zalozen ani "listy do przejscia" - to straszy. Przed kazdym kolejnym pytaniem sprawdz
   `date`: gdy zostaje okolo 5 minut, konczysz biezacy temat, zapisujesz i mowisz krotko, co udalo sie ustalic,
   oraz "Na nastepny raz zostalo: <tematy>". Gdy czas sie skonczyl, nie zaczynasz nowego tematu. Brak odpowiedzi
   o czas ("nie wiem", "ile trzeba") - przyjmij 30 minut.
3. Po odpowiedzi: parafraza i propozycja zapisu w 1-2 zdaniach - "Czyli … Zapisuje jako potwierdzone, ok?" -
   takze przy nowej decyzji D: "Czyli przyjmujemy: <decyzja jednym zdaniem>. Zapisuje?". Bez punktow, numerow D/A/BR,
   kaskady i powodu w tresci. Pelny wpis (rodzaj, tresc, powod, kaskada) pokazujesz tylko na prosbe ("szczegoly?",
   "co to zmienia?"). Nowe pytania odlozone na pozniej, kaskade i numery zapisujesz bez komentarza (krok 3 - w plikach
   wszystko jak dotad). Wyjatek: sprzecznosc z wczesniejsza decyzja albo obalenie zalozenia - jednym zdaniem, co sie
   nie zgadza, i pytanie, ktora wersja jest prawdziwa.
   Przyklad (fv-manager, Q-048, odpowiedz "nie wiem, przyjmuj pierwszy dzien miesiaca"):
   > Czyli przyjmujemy: sposób rozliczenia miesiąca bierzemy z okresu obowiązującego 1. dnia miesiąca, tak jak liczy
   > dziś aplikacja. Zapisuję? (Q-048)
4. Po "tak" zapis i nastepne pytanie w jednej wiadomosci: "Zapisane. Teraz o …". Bez osobnych komunikatow
   "A-xxx jest potwierdzone, a Q-xxx ma status …".
5. Regula odczytana z kodu (stan dzisiejszy, as-built): wystarczy proste "tak ma zostac?" albo lista do potwierdzenia
   hurtowego (krok 2c). Pytania o przeszlosc tam, gdzie odkrywasz, jak rozmowca naprawde pracuje - nie
   "kiedy ostatnio formularz pokazal blad", gdy chodzi tylko o potwierdzenie reguly.
6. "Nie wiem" / "nie dotyczy mnie" -> od razu jedno zdanie z propozycja odlozenia z warunkiem (punkt 6 kroku 2a), bez dodatkowej rundy.
7. Wznowiona rozmowa: odpowiedz juz jest w `01-interview/session-*.md` - nie pytasz drugi raz, tylko proponujesz zapis
   ("Mam Twoja odpowiedz z poprzedniej rozmowy: … Zapisuje?"). Sprawdzasz to przed kazdym pytaniem po wznowieniu.
8. Nie opisujesz swoich krokow ("czytam plik", "teraz zapisuje") - panel czatu pokazuje dzialania sam.

Przyklad BIZ (fv-manager, Q-027):
> Teraz o zwrocie z inwestycji. Aplikacja pokazuje „pozostało do zwrotu”: inwestycja minus oszczędności z domu
> i z ładowania auta. Kiedy ostatnio liczyłeś, w jakim stopniu instalacja już się zwróciła, to co brałeś pod uwagę? (Q-027)

Po odpowiedzi "inwestycje - oszczednosci z domu i EV":
> Czyli tak samo jak aplikacja - EV to tylko ładowanie domowe. Zapisuję jako potwierdzone; liczba miesięcy do zwrotu
> zostaje na później. Ok?

**INZ - pelne wpisy**. Uklad pytania i propozycji jak w krokach 2a i 3 ponizej (naglowek, fakty z kodu z numerami,
pelny wpis po kazdej odpowiedzi). Autor tez raz na poczatku.

## Krok 2a: tryb `live` (warsztat)
JEDNO pytanie naraz. Nigdy partia pytan - prowadzacy zbiera odpowiedzi na zywo i nie ma jak odpowiedziec na piec naraz.

1. Start wg stylu: w stylu BIZ - czas i tematy (sekcja "Styl rozmowy", punkt 2).
   W stylu INZ na start powiedz, ile jest pytan i w jakiej kolejnosci idziesz (priorytet jak wyzej). Listy pytan nie pokazuj.
2. Uklad pytania wg stylu (sekcja "Styl rozmowy"). W stylu BIZ - kontekst i pytanie w 1-3 zdaniach, ID dopiskiem.
   W stylu INZ kazde pytanie w tym samym ukladzie: naglowek `Pytanie X z N (Q-xxx): <temat>` (N rosnie, gdy odpowiedzi
   otwieraja nowe pytania), 1-3 punkty, co mowia zrodla (przy sprzecznosci cytaty obu stron), samo pytanie.
3. Po odpowiedzi od razu zapisz do `01-interview/session-YYYY-MM-DD.md`: pytanie, odpowiedz doslownie, kto
   (autor ustalony na poczatku rozmowy; zmiana rozmowcy - nowy autor od tej odpowiedzi).
   Kazde dopowiedzenie przy zatwierdzaniu tez dopisz doslownie do sesji.
4. Niejasna odpowiedz -> dopytaj raz (BIZ: zwyklym zdaniem; INZ: `Dopytanie do Q-xxx:`). Jesli odpowiedz na dopytanie
   dotyczy czegos innego, nie dopytuj drugi raz - zapisz, co pewne, reszta idzie do nowego Q.
5. Odpowiedz o stanie docelowym ("powinien...") zamiast o przeszlosci - przyjmij, ale oznacz w sesji
   "stan docelowy" i w D napisz, jesli dzisiejsza aplikacja dziala inaczej.
6. "Nie wiem" / "odlozmy" -> `zaparkowane` wymaga warunku. Zapytaj jednym zdaniem, czy pierwsza wersja moze
   ruszyc bez tego (i jak wtedy dziala). Tak -> `zaparkowane (nie blokuje go-live; <jak dziala do tego czasu>)`.
   Nie -> zostaje `otwarte` z etykieta blokujaca z SDD.yaml.
7. Jesli user przy zatwierdzaniu od razu odpowiada na pytanie, ktore D mialo otworzyc - wlacz to do D
   i nie zakladaj tego Q.
8. Odpowiedz sprzeczna z wczesniejsza D -> nie zapisuj, pokaz obie odpowiedzi obok siebie i dopytaj.
   Rozstrzygniecie = nowa D, a stara dostaje linie `Zmieniona przez: D-xxx`.
9. "Przerwij" / "stop" / "koniec" -> konczysz od razu. Niezatwierdzonej propozycji NIE zapisujesz; w sesji notka,
   co zostalo w toku (odpowiedz zostaje w sesji, Q zostaje otwarte). Podsumowanie jak "Na koniec" i nastepny krok
   z panelu - zwykle otwarte pytania nie trzymaja procesu w Interview, tylko sprzeczne i blokujace go-live.
10. Cel warsztatu to mapa procesu i aktorzy, nie szczegoly regul. Gdy masz aktorow i glowne encje, zaproponuj przejscie do `/sdd:domain`.

## Krok 2b: tryb `async` (rundy)
- Wygeneruj `01-interview/Q-round-N-<rola>.md`: naglowek z prosba i terminem (zapytaj usera o termin), potem kazde pytanie z pustym polem "Odpowiedz:" i "Kto udzielil odpowiedzi:". Prosty format, biznes czyta bez IT.
- Ustaw status tych pytan na `zadane (runda N, data)`.
- Gdy user wklei lub wgra odpowiedzi: sparsuj, dla kazdego pytania przejdz do kroku 3.

## Krok 2c: potwierdzenie hurtowe i akceptacja as-built (duzo A z `[App]`/`[Dok]`)
Gdy regula 3 daje wiele pytan potwierdzajacych (typowo: istniejaca aplikacja, fakty z kodu), nie zadawaj ich po jednym.
- **Akceptacja as-built** (istniejaca aplikacja, raz na modul): jedno pytanie do wlasciciela procesu - "obecne
  dzialanie aplikacji przyjmujemy jako docelowe, z wyjatkiem...?". Odpowiedz = jedna `D` ze zrodlem `[Biz]`
  (sesja/runda), wyjatki wymienione z nazwy. `A` z `[App]` spoza wyjatkow dostaja `potwierdzone` z dopiskiem
  `(akceptacja as-built D-xxx)`. NIE obejmuje: `A` z `[Dok]` i `[AI]` (dokument to nie dzialanie aplikacji),
  miejsc, gdzie kod przeczy dokumentacji albo wyglada na obejscie, oraz pytan `sprzeczne` - te ida osobno.
  `Przy awarii` w SYSTEMS NIE jest objete akceptacja as-built - zawsze osobne pytanie, bo kod czesto awarii w ogole nie obsluguje.
- **Potwierdzenie hurtowe** (reszta): w rundzie async jedna lista per rola - "to wynika z aplikacji/dokumentu,
  zaznacz tylko to, co sie nie zgadza". Kazda pozycja z ID `A`, jednym zdaniem i zrodlem. Odpowiedz "reszta OK"
  potwierdza nieoznaczone pozycje zrodlem `[Biz]` (runda, kto); oznaczone ida dalej jako zwykle pytania.
- Na zywo (`live`) to samo jako jedno pytanie z lista, nie N pytan.
- Niepotwierdzone `A` nie zatrzymuja pracy (validate: WARN 8, nizsza gotowosc), wiec liste mozna wyslac raz na etap.

## Krok 3: przetwarzanie odpowiedzi (tu PYTASZ przed zapisem)
`D` powstaje tylko z odpowiedzi biznesu: wpis `Zrodlo: [Biz] <sesja|runda|wiadomosc>`, `Zdecydowal` = rola, ktora
odpowiedziala. Fakt odczytany z kodu, aplikacji albo dokumentu - nawet zatwierdzony przez prowadzacego - to `A`
`niepotwierdzone` z tym zrodlem, nie `D` (validate kontrola 16 = BLOCK). Zgoda na wpis nie zastepuje zrodla.
Odpowiedzi moga przyjsc tez z Tablicy warsztatowej (pole "Odpowiedź" na czerwonej karteczce, `answer` w board.json) -
`/sdd:board sync` przetwarza je tym samym krokiem.
Dla kazdej odpowiedzi zaproponuj (BIZ: 1-2 zdania, pelny wpis tylko gdy cos sie dzieje - sekcja "Styl rozmowy";
INZ: 3-5 linijek):
- czy to decyzja D (rozstrzyga) czy potwierdzenie/obalenie A, czy nowe pytanie
- tresc wpisu - tylko to, co padlo; bez wlasnych dopowiedzen
- kaskada: ktore R, AC, A na tym stoja (przeszukaj PRD, RULES, ASSUMPTIONS)
- powod: jesli nie padl, zaproponuj go jednym zdaniem do potwierdzenia
Czekaj na "tak". Powod niepotwierdzony wpisz jako `[AI] wniosek prowadzacego, niepotwierdzony - ...` (regula 2 wroci z nim jako pytanie). Dopiero wtedy: wpis do DECISIONS/ASSUMPTIONS, status Q -> `odpowiedziane`, wypelnij "Zamkniete przez", dopisz dotkniete R do sekcji "Do przegladu" w PRD, linia w CHANGELOG.

Jesli odpowiedz jest niejasna lub otwiera nowe pytanie, dodaj nowe Q z "Skad" = odpowiedz na Q-xxx. To normalne.

## Na koniec
Wypisz: ile pytan wygenerowano / zadano / zamknieto, ile A obalono, ile R do przegladu. Max 5 linijek.

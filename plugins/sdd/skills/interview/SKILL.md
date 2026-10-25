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

Zasady formulowania - pytanie ma wydobyc fakt z doswiadczenia rozmowcy, nie jego deklaracje:
- pytasz o przeszlosc: "co zrobiles ostatnio, gdy..." (hipoteza "czy chcialbys..." daje deklaracje, nie fakt)
- pytanie otwarte, na ktore odpowiada sie zdaniem, nie tak/nie
- jedno pytanie = jedna rzecz
- pytanie neutralne - tresc odpowiedzi pochodzi od rozmowcy, nie z Twojej podpowiedzi
- drazysz wyjatki i obejscia ("a co, gdy...", "jak to obchodzicie dzis")
- sprawdzasz: jednorazowka czy wzorzec ("ile razy w miesiacu")

Priorytet: sprzeczne > otwarte z etykieta blokujaca > reszta. Grupuj per adresat (rola).

## Styl rozmowy (BIZ / INZ)
Dotyczy rozmowy na zywo (`live`) i tur warsztatu `/sdd:board`. Pliki (sesja, D, A, Q, kaskada, CHANGELOG) w obu stylach
sa takie same - styl zmienia tylko to, co user czyta na ekranie.
- Rozmowa w panelu sdd-board: okno czatu panelu = BIZ, terminal panelu = INZ - panel dopisuje to w instrukcji
  startowej i ma to pierwszenstwo przed `interview_style`.
- Styl bierzesz z `interview_style` w `SDD.yaml`; brak pola = domyslnie `biz`. Argument nadpisuje na te rozmowe:
  `/sdd:interview live biz`, `/sdd:interview live inz`. W trakcie: "przejdz na BIZ" / "przejdz na INZ" - od nastepnego pytania.
- **Autor raz na poczatku** (oba style): "Rozmawiam z Toba jako <rola z SDD.yaml>, tak?". Dalej kazda odpowiedz ma tego
  autora; pytasz ponownie tylko, gdy user powie, ze odpowiada ktos inny. Pytania koncza sie na samym pytaniu.
- **BIZ - swobodna rozmowa (domyslnie)**: czas rozmowy zamiast liczby pytan, zwykle zdania, krotkie potwierdzenia.
  Przed pierwszym pytaniem w stylu BIZ przeczytaj `references/style.md` (uklad pytania, czas, reakcja na odpowiedz,
  przyklad) i stosuj go do konca rozmowy.
- **INZ - pelne wpisy**: uklad pytania i propozycji jak w krokach 2a i 3 ponizej (naglowek, fakty z kodu z numerami,
  pelny wpis po kazdej odpowiedzi).

## Krok 2a: tryb `live` (warsztat)
JEDNO pytanie naraz - prowadzacy zbiera odpowiedzi na zywo i na piec pytan naraz nie ma jak odpowiedziec.

1. Start wg stylu: w stylu BIZ - czas i tematy (`references/style.md`, punkt 2).
   W stylu INZ na start powiedz, ile jest pytan i w jakiej kolejnosci idziesz (priorytet jak wyzej). Listy pytan nie pokazuj.
2. Uklad pytania wg stylu. W stylu BIZ - kontekst i pytanie w 1-3 zdaniach, ID dopiskiem.
   W stylu INZ kazde pytanie w tym samym ukladzie: naglowek `Pytanie X z N (Q-xxx): <temat>` (N rosnie, gdy odpowiedzi
   otwieraja nowe pytania), 1-3 punkty, co mowia zrodla (przy sprzecznosci cytaty obu stron), samo pytanie.
3. Po odpowiedzi od razu zapisz do `01-interview/session-YYYY-MM-DD.md`: pytanie, odpowiedz doslownie, kto
   (autor ustalony na poczatku rozmowy; zmiana rozmowcy - nowy autor od tej odpowiedzi).
   Kazde dopowiedzenie przy zatwierdzaniu tez dopisz doslownie do sesji.
4. Niejasna odpowiedz (tabela w kroku 3) -> dopytaj raz (BIZ: zwyklym zdaniem; INZ: `Dopytanie do Q-xxx:`). Jesli odpowiedz na dopytanie
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
9. "Przerwij" / "stop" / "koniec" -> konczysz od razu. Do DECISIONS/ASSUMPTIONS idzie tylko to, co zatwierdzone;
   w sesji notka, co zostalo w toku (odpowiedz zostaje w sesji, Q zostaje otwarte). Podsumowanie jak "Na koniec"
   i nastepny krok z panelu - zwykle otwarte pytania nie trzymaja procesu w Interview, tylko sprzeczne i blokujace go-live.
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

## Krok 3: przetwarzanie odpowiedzi
`D` powstaje tylko z odpowiedzi biznesu: wpis `Zrodlo: [Biz] <sesja|runda|wiadomosc>`, `Zdecydowal` = rola, ktora
odpowiedziala. Fakt odczytany z kodu, aplikacji albo dokumentu - nawet zatwierdzony przez prowadzacego - to `A`
`niepotwierdzone` z tym zrodlem, nie `D` (validate kontrola 16 = BLOCK). Zgoda na wpis nie zastepuje zrodla.
Odpowiedzi moga przyjsc tez z Tablicy warsztatowej (pole "Odpowiedź" na czerwonej karteczce, `answer` w board.json) -
`/sdd:board sync` przetwarza je tym samym krokiem, jak w kolumnie INZ.

Kiedy zapis od razu, a kiedy najpierw pytanie:

| Odpowiedz | BIZ | INZ i `/sdd:board sync` |
|---|---|---|
| jasna i pelna | zapis od razu, potem jedno zdanie, co zapisales, i nastepne pytanie | propozycja wpisu, zapis po "tak" |
| niejasna, niepelna albo wieloznaczna; interpretacja wychodzi poza slowa rozmowcy; z odpowiedzi powstaje nowa decyzja D | parafraza jako pytanie, zapis po "tak" | propozycja wpisu, zapis po "tak" |
| sprzeczna z wczesniejsza D albo obala A | jedno zdanie, co sie nie zgadza, i pytanie, ktora wersja jest prawdziwa | obie odpowiedzi obok siebie i dopytanie (krok 2a, punkt 8) |

Rozmowca moze poprawic kazdy zapis ("nie, to nie tak") - wtedy poprawiasz wpis.

Propozycja wpisu (INZ: 3-5 linijek; BIZ: parafraza, pelny wpis tylko na prosbe):
- czy to decyzja D (rozstrzyga) czy potwierdzenie/obalenie A, czy nowe pytanie
- tresc wpisu - tylko to, co padlo, slowami rozmowcy
- kaskada: ktore R, AC, A na tym stoja (przeszukaj PRD, RULES, ASSUMPTIONS)
- powod: jesli nie padl, zaproponuj go jednym zdaniem do potwierdzenia

Powod niepotwierdzony wpisz jako `[AI] wniosek prowadzacego, niepotwierdzony - ...` (regula 2 wroci z nim jako pytanie).
Zapis: wpis do DECISIONS/ASSUMPTIONS, status Q -> `odpowiedziane`, wypelnij "Zamkniete przez", dopisz dotkniete R
do sekcji "Do przegladu" w PRD, linia w CHANGELOG.

Jesli odpowiedz jest niejasna lub otwiera nowe pytanie, dodaj nowe Q z "Skad" = odpowiedz na Q-xxx. To normalne.

## Na koniec
Wypisz: ile pytan wygenerowano / zadano / zamknieto, ile A obalono, ile R do przegladu. Max 5 linijek.

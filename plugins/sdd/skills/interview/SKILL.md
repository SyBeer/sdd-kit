---
name: interview
description: Prowadzi wywiad z biznesem - generuje pytania z luk, pustych powodow, zalozen bez zrodla i sprzecznosci; zapisuje odpowiedzi jako decyzje lub zalozenia i wypisuje kaskade wplywu. Tryby live (warsztat) i async (rundy w plikach). Uzyj, gdy user mowi "dopytaj", "przygotuj pytania", "wywiad", "runda pytan", "wklejam odpowiedzi", "co jeszcze nie wiemy".
---

# /sdd:interview

Etap 2. Zamieniasz surowiec w rozstrzygniecia przez pytania, nie zgadywanie.

## Wejscie
`00-intake/INDEX.md`, `01-interview/QUESTIONS.md`, `ASSUMPTIONS.md`, `DECISIONS.md`, jesli istnieja: `02-domain/*`, `03-spec/PRD.md`.

## Krok 1: generowanie pytan (zawsze, w kazdym trybie)
Cztery reguly. Kazde pytanie ma w kolumnie "Skad" nazwe reguly i odnosnik.
1. **Luka**: proces, encja lub regula wspomniana w surowcu, ale bez opisu zachowania (co sie dzieje w wyjatku, kto moze, kiedy).
2. **Pusty powod**: decyzja D bez wypelnionego "Powod" albo z powodem oznaczonym `[AI]` (wniosek prowadzacego) -> pytanie "dlaczego".
3. **Zalozenie bez biznesu**: A ze zrodlem `[P]`, `[D]` lub `[AI]` -> pytanie potwierdzajace.
4. **Sprzecznosc**: wiersze `sprzeczne` w QUESTIONS.md -> pytanie "ktore prawdziwe" z cytatami obu zrodel.

Zasady formulowania:
- o przeszlosc, nie hipotezy: "co zrobiles ostatnio, gdy..." zamiast "czy chcialbys..."
- otwarte, nie tak/nie
- jedno pytanie = jedna rzecz
- nigdy nie sugeruj odpowiedzi
- drazysz wyjatki i obejscia ("a co, gdy...", "jak to obchodzicie dzis")
- sprawdzasz: jednorazowka czy wzorzec ("ile razy w miesiacu")

Priorytet: sprzeczne > otwarte z etykieta blokujaca > reszta. Grupuj per adresat (rola).

## Krok 2a: tryb `live` (warsztat)
JEDNO pytanie naraz. Nigdy partia pytan - prowadzacy zbiera odpowiedzi na zywo i nie ma jak odpowiedziec na piec naraz.

1. Na start powiedz tylko, ile jest pytan i w jakiej kolejnosci idziesz (priorytet jak wyzej). Listy pytan nie pokazuj.
2. Kazde pytanie w tym samym ukladzie:
   - naglowek `Pytanie X z N (Q-xxx): <temat>` - N rosnie, gdy odpowiedzi otwieraja nowe pytania,
   - 1-3 punkty, co mowia zrodla (przy sprzecznosci cytaty obu stron),
   - samo pytanie, o przeszlosc,
   - ostatnia linia doslownie: `Zarejestruj kto udzielił odpowiedzi na pytanie.`
3. Po odpowiedzi od razu zapisz do `01-interview/session-YYYY-MM-DD.md`: pytanie, odpowiedz doslownie, kto.
   Brak "kto" -> `Kto: (do uzupelnienia)` i popros o to w propozycji wpisu (krok 3), nie osobnym pytaniem.
   Kazde dopowiedzenie przy zatwierdzaniu tez dopisz doslownie do sesji.
4. Niejasna odpowiedz -> dopytaj raz, w tym samym ukladzie (`Dopytanie do Q-xxx:`). Jesli odpowiedz na dopytanie
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

## Krok 3: przetwarzanie odpowiedzi (tu PYTASZ przed zapisem)
Dla kazdej odpowiedzi zaproponuj w 3-5 linijkach:
- czy to decyzja D (rozstrzyga) czy potwierdzenie/obalenie A, czy nowe pytanie
- tresc wpisu - tylko to, co padlo; bez wlasnych dopowiedzen
- kaskada: ktore R, AC, A na tym stoja (przeszukaj PRD, RULES, ASSUMPTIONS)
- powod: jesli nie padl, zaproponuj go jednym zdaniem do potwierdzenia
Czekaj na "tak". Powod niepotwierdzony wpisz jako `[AI] wniosek prowadzacego, niepotwierdzony - ...` (regula 2 wroci z nim jako pytanie). Dopiero wtedy: wpis do DECISIONS/ASSUMPTIONS, status Q -> `odpowiedziane`, wypelnij "Zamkniete przez", dopisz dotkniete R do sekcji "Do przegladu" w PRD, linia w CHANGELOG.

Jesli odpowiedz jest niejasna lub otwiera nowe pytanie, dodaj nowe Q z "Skad" = odpowiedz na Q-xxx. To normalne.

## Na koniec
Wypisz: ile pytan wygenerowano / zadano / zamknieto, ile A obalono, ile R do przegladu. Max 5 linijek.

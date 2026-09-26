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
2. **Pusty powod**: decyzja D bez wypelnionego "Powod" -> pytanie "dlaczego".
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
- Pokaz partie 5-7 pytan na ekran, najwyzszy priorytet najpierw.
- User wpisuje odpowiedzi skrotowo. Po kazdej: jesli niejasna, dopytaj raz. Nie wiecej.
- Zapisuj odpowiedzi do `01-interview/session-YYYY-MM-DD.md` (pytanie, odpowiedz dosłownie, kto).
- Cel warsztatu to mapa procesu i aktorzy, nie szczegoly regul. Gdy masz aktorow i glowne encje, zaproponuj przejscie do `/sdd:domain`.

## Krok 2b: tryb `async` (rundy)
- Wygeneruj `01-interview/Q-round-N-<rola>.md`: naglowek z prosba i terminem (zapytaj usera o termin), potem kazde pytanie z pustym polem "Odpowiedz:" i "Kto odpowiada:". Prosty format, biznes czyta bez IT.
- Ustaw status tych pytan na `zadane (runda N, data)`.
- Gdy user wklei lub wgra odpowiedzi: sparsuj, dla kazdego pytania przejdz do kroku 3.

## Krok 3: przetwarzanie odpowiedzi (tu PYTASZ przed zapisem)
Dla kazdej odpowiedzi zaproponuj w 3-5 linijkach:
- czy to decyzja D (rozstrzyga) czy potwierdzenie/obalenie A, czy nowe pytanie
- tresc wpisu
- kaskada: ktore R, AC, A na tym stoja (przeszukaj PRD, RULES, ASSUMPTIONS)
Czekaj na "tak". Dopiero wtedy: wpis do DECISIONS/ASSUMPTIONS, status Q -> `odpowiedziane`, wypelnij "Zamkniete przez", dopisz dotkniete R do sekcji "Do przegladu" w PRD, linia w CHANGELOG.

Jesli odpowiedz jest niejasna lub otwiera nowe pytanie, dodaj nowe Q z "Skad" = odpowiedz na Q-xxx. To normalne.

## Na koniec
Wypisz: ile pytan wygenerowano / zadano / zamknieto, ile A obalono, ile R do przegladu. Max 5 linijek.

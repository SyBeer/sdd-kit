# /sdd:board processes

## Procesy z dzialajacej aplikacji (`/sdd:board processes`)
Rozpisuje procesy istniejacej aplikacji (as-built) na karteczki - punkt wyjscia do warsztatu "jak to dziala dzis".
Zapis tylko do `board.json` (odtwarzalne, bez pytania). Nie tworzysz R, BR, D ani Q w plikach - to robi `sync`.
1. Czytaj: aktualny `board.json`, `00-intake/INDEX.md` (zrodla `as-built`, zwlaszcza odczyt kodu `[App]`),
   `DECISIONS.md`, `RULES.md`, `QUESTIONS.md`, sekcje "Poza zakresem" i kandydatow w PRD.
2. Czytaj aplikacje: punkty wejscia (trasy, ekrany, formularze, komendy CLI), logike obliczen i walidacji, integracje,
   README. Kod czytasz fragmentami (grep po trasach i funkcjach), nie calymi plikami.
3. Pasy = procesy tak, jak je widzi uzytkownik (cel: "Miesieczny odczyt", "Rozliczenie miesiaca"), nie pliki ani
   endpointy. Zwykle 5-9 pasow. Pasy i karteczki usera zostaja; pusty pas domyslny ("Nowy proces") mozna usunac;
   `Do wyjaśnienia` na koncu `lanes`.
4. W pasie od lewej wg przebiegu: `act` (kto) -> `cmd` (co robi) -> `pol` (regula/walidacja) -> `ev` (co sie stalo)
   -> `rm` (co oglada). Kazda karteczka w swojej kolumnie. Tresc jezykiem biznesu ("Wpisz cene paliwa recznie"),
   nie nazwa trasy; regula w formie "Jezeli ..., to ...".
5. `source` = `[App] <plik>:<linia>` albo `[App]/[Dok] <plik z INDEX.md>, sekcja`. Gdy jest decyzja `[Biz]`
   (D-xxx), dopisz ja na poczatku - wygrywa z kodem.
   Stan "w plikach" (✓ na tablicy) zalezy od tego, czy element juz jest w plikach wymagan - sprawdz to dla kazdej karteczki:
   - **juz w plikach** (regula BR-xxx w RULES.md, wymaganie R w PRD, decyzja D, zalozenie A, istniejace Q, rola
     z ACTORS.md, stan z ENTITIES.md): `ref` = jego numer (rola i stan nie maja numeru - bez `ref`), `file` = plik,
     w ktorym jest, `synced` = teraz. Panel pokaze ✓ i sam sprawdzi, czy `ref` naprawde jest w `file`;
   - **tylko z kodu** (`[App]` bez odpowiednika w plikach), "(docelowo; dzis ...)" i nowe pytania z punktu 8:
     bez `synced` i bez `file`. Panel pokaze "tylko na tablicy", do plikow przeniesie je `/sdd:board sync`.
   `file` znaczy zawsze "tu to jest" - nigdy "tu to trafi". Nowemu Q nie dawaj `synced`: numeru nie ma jeszcze
   w QUESTIONS.md, wiec panel pokazalby "!".
6. Decyzja mowi co innego niz kod -> karteczka opisuje stan docelowy z dopiskiem "(docelowo; dzis ...)".
   Funkcje oznaczone w PRD jako poza zakresem (makiety itp.) pomijasz.
7. **Docelowe**: wymagania R z PRD (i ich BR, D), ktorych nie ma w kodzie - nowy krok w istniejacym procesie
   albo caly nowy proces - stawiasz jako karteczki z `target: true`, zrodlo `[Biz] PRD R-xxx` (albo `[Biz] RULES BR-xxx`),
   `ref` = numer z pliku, `file` = plik, `synced` = teraz (sa juz w plikach). Nowy krok - w pasie procesu, w kolumnie,
   w ktorej ma wypasc; nowy proces - osobny pas (wszystkie jego karteczki docelowe), wstawiony wg przebiegu.
   Tylko R zatwierdzone albo robocze z sekcji zakresu - nie z "Poza zakresem". Wymaganie czesciowo zbudowane:
   karteczka dzisiejsza + docelowa z brakujaca czescia.
8. Rozjazd kod vs dokumentacja, funkcja opisana, a nieobecna w kodzie, zachowanie bez zrodla `[Biz]` budzace
   watpliwosc -> `hot` przy karteczce, ktorej dotyczy (SKILL.md, sekcja "Gdzie stawiac pytanie"), `ref` = kolejne wolne Q-xxx
   z QUESTIONS.md. Pytanie o przeszlosc ("kiedy ostatnio..., jak to zrobiles?"). Najwyzej kilka - reszta przy `sync`.
9. Nie dubluj: karteczka o tym samym `ref` albo tej samej tresci w pasie juz jest -> pomijasz.
   `id` unikalne, `by: "agent"`, `created` = `updated` = teraz (`date -Iseconds`). Tytul/podtytul tablicy:
   nazwa aplikacji + wersja + "as-built", jesli byly domyslne.
10. Linia w `CHANGELOG.md` (liczba procesow, karteczek, numery Q) i odpowiedz: lista pasow po 1 zdaniu,
   ile karteczek jest juz w plikach (✓), a ile tylko na tablicy (do `sync`), ile docelowych (`target`) i w jakich
   procesach, co oznaczyles "(docelowo; dzis ...)", jakie `hot`,
   jedno pytanie o przeszlosc.

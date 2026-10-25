# /sdd:board tidy

## Porzadek na tablicy (`/sdd:board tidy`)
Sprzata sama tablice. Zapis tylko `board.json`. Nie tworzysz R, BR, D ani Q
w plikach - to robi `sync`.
1. Czytaj `board.json` i `QUESTIONS.md` (stan pytan). Szukaj:
   - duplikatow: ta sama tresc (bez wielkosci liter i spacji) albo ten sam `ref` w procesie;
   - karteczek w zlym procesie: tresc wyraznie o innym procesie (nazwa procesu, encja, aktor);
   - kolejnosci w pasie niezgodnej z przebiegiem: `act` -> `cmd` -> `pol` -> `ev` -> `rm`;
   - dziur i nakladania w kolumnach (dwie karteczki w tej samej kolumnie pasa bez powodu, puste kolumny w srodku);
   - pustych procesow (bez karteczek; domyslny "Nowy proces");
   - pytan `hot`, ktore w `QUESTIONS.md` sa juz odpowiedziane albo zaparkowane (do zdjecia - tablica ma przycisk
     "Zdejmij zamknięte");
   - karteczek bez procesu (`lane` spoza `lanes`).
2. **Najpierw propozycja, bez zapisu**: lista zmian po 1 zdaniu, pogrupowana (duplikaty, przeniesienia, kolumny,
   procesy, pytania), ponumerowana. Zapytaj: "Robie? (mozesz: tak / tak, bez 3 / nie)". Czekasz na "tak".
3. Zasady zmian:
   - nie zmieniasz tresci karteczek - tylko miejsce (`lane`, `col`); poprawke tresci proponujesz jako pytanie;
   - karteczek usera (`by: "człowiek"` albo `source` "warsztat, dopisane w przegladarce") nie usuwasz bez zgody na te
     konkretna karteczke (wymien ja z numerem w propozycji); duplikat usera z karteczka agenta - usuwasz karteczke agenta;
   - przy duplikatach zostaje ta z `ref` / `synced` / `answer`; reszta pol (zrodlo) dopisana do niej, jesli wnosi cos;
   - `space` (odstepy) zostawiasz, chyba ze stoja na koncu pasa;
   - przeniesionym karteczkom `updated` = teraz (`date -Iseconds`); `synced`, `ref`, `file` bez zmian.
4. Po zapisie: linia w `CHANGELOG.md` (ile przeniesionych, usunietych, procesow) i podsumowanie 3-5 linijek; jesli
   cos czeka na zapis do plikow - zaproponuj `/sdd:board sync`.

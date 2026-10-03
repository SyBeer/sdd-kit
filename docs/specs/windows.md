# Spec: Panel na Windows (konce linii, sciezki, aktualizacja)

Status: zatwierdzony zakres 2026-10-03 (user: "napraw i wydaj 0.27.1" po wyniku testow panelu na prawdziwym Windows
w GitHub Actions: 13 ze 153 nie przeszlo)
Wersja docelowa: 0.27.1

## Przyczyny (z przebiegu Actions 37155780039)
1. Git na Windows zapisuje pliki z CRLF (`core.autocrlf=true` domyslnie). Parsery dziela tekst po `\n` - zostaje `\r`
   na koncu linii: zle statusy etapow (Domain "todo" w gotowym module), puste liczby w zakladce Modul, nowy modul
   z rolami z szablonu zamiast podanych.
2. Sciezki do wyswietlenia skladane `path.join` -> `03-spec\PRD.md`.
3. `gitState` porownywal sciezke z gita (`C:/Users/...`) z `realpathSync` (`C:\Users\RUNNER~1\...`) -> kit nigdy nie
   byl rozpoznany jako repo Git, aktualizacja z panelu niemozliwa.
4. Testy instalatora z atrapami bash uruchamialy sie na Windows (pwsh jest na maszynach GitHuba).

## Zakres
- Odczyt plikow wymagan w panelu (progress, info, modules, server: tablica, SDD.yaml) zamienia `\r\n` na `\n`;
  odcisk wymagan zamienia `\r+\n` na `\n` (takze `\r\r\n`). Zapis SDD.yaml z panelu - z `\n`.
- `createModule` przyjmuje `opts.templates` (test na szablonach z CRLF).
- Sciezki w szczegolach etapow zawsze z `/`.
- `same(a, b)` w update.js: `realpathSync.native` obu sciezek, na Windows `\` i male litery.
- `claude` na Windows: `cmd /d /s /c "<polecenie>"` (cale polecenie w jednej parze cudzyslowow).
- Testy instalatora z atrapami bash pomijane na Windows; krok "Testy panelu na Windows" w Actions przestaje byc
  informacyjny (blad = czerwony przebieg).

## Kryteria akceptacji
- AC-W1: `readProgress` na kopii modulu demo z CRLF = wynik dla LF (statusy, szczegoly bez rozmiaru i daty pliku).
- AC-W2: `fingerprint` kopii z CRLF = odcisk LF.
- AC-W3: `createModule` z szablonow CRLF wpisuje podana role i poziom; `moduleInfo` czyta poziom.
- AC-W4: `moduleSummary` z CRLF = LF (liczby).
- AC-W5: szczegoly Spec maja `file` `03-spec/PRD.md` na kazdym systemie (AC-56 na Windows).
- AC-W6: `gitState` rozpoznaje repo w folderze tymczasowym Windows (AC-UP4/AC-UP5 na Windows).
- AC-W7 (Actions): na Windows wszystkie testy panelu przechodza (atrapy bash pominiete), krok blokujacy.
- Lokalnie: caly zestaw testow przechodzi takze w klonie z `core.autocrlf=true`.

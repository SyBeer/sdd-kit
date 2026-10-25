# Spec: Wersja w pasku zawsze prowadzi do karty Serwer; aktualizacja jednym przyciskiem (zmiana 0.46.0)

Status: zakres od usera 2026-10-25: "po kliknieciu na 'v0.45.0 · plugin nieaktualny · sesja Claude nieaktualna'
powinno zawsze przeniesc na strone z informacja o serwerze. Jezeli jest nowa wersja do aktualizacji SDD-KIT - niech
bedzie prosta aktualizacja poprzez zwykla ikonke aktualizuj. Jezeli potrzebne sa dzialania jak restart claude,
pluginu itp - niech pojawia sie odpowiednie komendy".

## Problem
1. Klik w wersje w pasku stanu prowadzi raz do Konfiguracji (gdy jest ostrzezenie), raz na GitHub (gdy nie ma) -
   user nie wie, gdzie trafi.
2. "Plugin nieaktualny" wymaga przepisania dwoch komend `claude plugin ...` do terminala, choc serwer umie je
   uruchomic sam (to samo robi aktualizacja z GitHuba, AC-UP7).
3. Nowa wersja z GitHuba w karcie Serwer: "Aktualizuj…" otwiera dodatkowe okienko w pasku stanu.
4. Restart serwera i sesji Claude opisany slowami ("zatrzymaj i uruchom ponownie") - bez gotowej komendy.

## Cel
Jedno miejsce (Konfiguracja → Serwer) z wersja, przyciskiem "Aktualizuj" dla wszystkiego, co panel umie zrobic sam,
i gotowymi komendami (z "Kopiuj") dla tego, czego nie umie (restart serwera, restart sesji Claude Code).
Metryka: po aktualizacji user doprowadza wszystko do stanu "bez ostrzezen" bez pisania komend z pamieci.

## Zakres
- `versionBadge` (ui.js): poza demo-startem klik zawsze -> `<base>/config#wersja`, ta sama karta (`local: true`);
  demo-start (bez Konfiguracji) - GitHub jak dotad.
- Kroki `steps` - element `{text, cmd?, action?, manual?}`:
  - plugin nieaktualny -> `{action: 'plugin'}` "Zaktualizuj plugin z X do Y" (przycisk Aktualizuj),
    `manual` = dotychczasowe 2 komendy (pokazane jako "albo w terminalu");
  - serwer nieaktualny -> komenda restartu z `/api/version` (`restart`: dokladne polecenie, ktorym serwer zostal
    uruchomiony, sciezki bezwzgledne); brak -> `sdd-board`;
  - sesje Claude do restartu (nieaktualne sesje albo plugin nieaktualny): "w sesji wpisz" `/exit`, potem
    `cd "<folder>" && command claude --continue` dla kazdej nieaktualnej sesji (Windows `cd "<folder>"; claude --continue`);
    bez znanych sesji - `command claude --continue` w folderze projektu.
- Serwer: `POST /api/update` z `{"plugin": true}` uruchamia tylko 2 kroki `claude plugin` (bez `git pull`,
  bez sprawdzania niezapisanych zmian - kit na dysku juz jest w nowej wersji); `GET /api/version` zwraca `restart`.
- Karta Serwer: przycisk "Aktualizuj" przy kroku plugin i przy "jest nowa wersja X" uruchamia aktualizacje w miejscu
  (bez okienka z paska), pokazuje "Aktualizuję…", wynik / log bledu i po sukcesie odswieza kroki (pojawiaja sie
  komendy restartu).

## Poza zakresem
- Automatyczny restart serwera i sesji Claude Code (serwer bywa uruchamiany przez HQAI / terminal; sesje to procesy usera).
- Okienko nowej wersji w pasku stanu (strzalka ↓) zostaje bez zmian.

## Kryteria akceptacji
- **AC-VP1** `versionBadge(v, '')` bez ostrzezen: `href` `/config#wersja`, `local: true`, `steps: []`, dymek konczy
  sie "Kliknij: wersja i serwer"; `versionBadge(v, '/demo')` -> `/demo/config#wersja`; `'/demo/start'` -> GitHub.
- **AC-VP2** plugin nieaktualny: pierwszy krok `action: 'plugin'`, `manual` = 2 komendy `claude plugin`;
  dalej kroki restartu sesji z `/exit` i `claude --continue`.
- **AC-VP3** serwer nieaktualny + `v.restart` -> krok z `cmd === v.restart`; bez `v.restart` -> `cmd: 'sdd-board'`.
- **AC-VP4** nieaktualna sesja `{cwd:'/x'}`: krok `/exit` i krok `cd "/x" && command claude --continue`;
  Windows `cd "/x"; claude --continue`.
- **AC-VP5** serwer: `POST /api/update {"plugin":true}` przy zrodle `directory` z niezapisanymi zmianami (pelna
  aktualizacja = blad) -> 200, `ok: true`, log 2 krokow `claude plugin`, bez `git`.
- **AC-VP6** `GET /api/version` zawiera `restart` z `server.js` i portem.
- **AC-VP7** info.html: przycisk `data-vact` (krok `action: plugin`) i "Aktualizuj" nowej wersji wysylaja `POST /api/update`
  bez `SddUI.openUpdate()`; po sukcesie ponownie `versionNote()`.
- **AC-VP8** (reczne): pasek "v0.45.0 · plugin nieaktualny" -> klik -> karta Serwer, "Aktualizuj" -> plugin 0.45.0,
  zostaja komendy restartu sesji.

## Testy (TDD, przed kodem)
`board/test/version-page.test.js`: AC-VP1..VP4 (`versionBadge`), AC-VP5..VP6 (prawdziwy serwer, atrapa `claude`
przez `SDD_CLAUDE_BIN`), AC-VP7 (tekst info.html). AC-U16 i AC-U20 w ui.test.js zaktualizowane do nowej reguly.

# Spec: Klucze API w pliku ~/.sdd-kit/.env

Status: zatwierdzony zakres 2026-10-04 (user: "aplikacja SDD-kit moze miec konfiguracje klucza w pliku env. I co do
zasady Claude jej nie czyta, ale aplikacja juz moze")
Wersja docelowa: 0.28.5

## Cel
Jedno miejsce na klucze (na razie Redmine), takie samo na macOS i Windows, ustawiane z panelu bez terminala.
Kit (skrypt, serwer panelu) czyta klucze; Claude - z zasady - nie otwiera tego pliku (umowa w instrukcjach,
nie blokada systemowa; twarda blokada wymagalaby sandboxa Claude Code - poza zakresem, decyzja usera).

## Zakres
1. Plik `~/.sdd-kit/.env` (`SDD_ENV_FILE` zmienia sciezke - testy): linie `KLUCZ=wartosc`, `#` komentarz,
   wartosc moze byc w cudzyslowie. Zapis tylko przez kit; uprawnienia 600 (macOS/Linux).
2. Klucz Redmine (`redmine.js`): zmienna `REDMINE_API_KEY` > plik `.env` > Pek kluczy macOS (`redmine-api-key`).
   Komunikat o braku klucza wskazuje najpierw panel (Konfiguracja), potem plik.
3. Panel, Konfiguracja (przy `backlog: redmine`): pole "Klucz API Redmine" (typ hasla) z przyciskami Zapisz i Usun;
   stan: "ustawiony (plik .env)", "ustawiony (zmienna)", "ustawiony (Pek kluczy)", "brak". Serwer:
   `GET /api/config` -> `redmineKey` = `env` | `file` | `keychain` | `none` (nigdy wartosc);
   `PUT /api/secrets {REDMINE_API_KEY}` zapisuje / pusta wartosc usuwa wpis; tylko `X-SDD` + Host lokalny, demo 403,
   dozwolone tylko znane klucze (`REDMINE_API_KEY`), wartosc bez znakow nowej linii; odpowiedz bez wartosci;
   wpis w logu serwera / CHANGELOG modulu - bez wartosci.
4. Zasada dla Claude: skill handover i szablon `CLAUDE.md` modulu - nie otwieraj, nie wypisuj i nie kopiuj
   `~/.sdd-kit/.env`; klucz ustawia czlowiek (panel albo plik).
5. `.gitignore` repo kitu: `/.env`, `/config.json`, `/bin/` (tylko w korzeniu) - przy instalacji jedna komenda `~/.sdd-kit` to klon repo;
   pliki kitu nie moga robic z niego "niezapisanych zmian" (blokowalyby aktualizacje z panelu, AC-UP3).

## Kryteria akceptacji
- AC-S1: `readEnv(text)` - pary klucz/wartosc, komentarze i puste linie pominiete, cudzyslowy zdjete, `export ` na
  poczatku dozwolone; `setEnv(text, key, value)` - podmienia albo dopisuje linie, pusta wartosc usuwa linie,
  reszta pliku bez zmian.
- AC-S2: `redmineKey(env)`: zmienna > plik > Pek kluczy; zrodlo (`env`/`file`/`keychain`/`none`) i wartosc.
- AC-S3 (serwer): `PUT /api/secrets` zapisuje do pliku (600 poza Windows), odpowiedz i `GET /api/config` bez wartosci,
  `redmineKey: file`; pusty -> wpis usuniety, `none`; nieznany klucz, nowa linia w wartosci -> 400; bez `X-SDD` -> 403;
  demo -> 403.
- AC-S4: `redmine.js check` z kluczem tylko w pliku `.env` laczy sie; komunikat o braku klucza wskazuje panel.
- AC-S5: skill handover i szablon CLAUDE.md zawieraja zakaz czytania `~/.sdd-kit/.env`; `.gitignore` zawiera
  `/.env`, `/config.json`, `/bin/`.
- AC-S6 (reczne): panel - zapis klucza, stan "ustawiony (plik .env)", Usun -> "brak"; klucz nie pojawia sie w HTML
  ani w odpowiedziach.

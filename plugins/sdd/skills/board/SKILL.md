---
name: board
description: Lokalna tablica warsztatowa (karteczki jak w Event Stormingu) odswiezana na zywo w przegladarce, bez Miro. Agent stawia karteczki piszac do requirements/01-interview/board.json, po warsztacie synchronizuje tablice do plikow. Uzyj, gdy user mowi "tablica", "board", "warsztat na zywo", "pokaz na karteczkach", "event storming", albo podczas /sdd:interview live.
---

# /sdd:board

Tablica to WIDOK. Pliki w `requirements/` sa PRAWDA. Nigdy odwrotnie.

## Uruchomienie (`/sdd:board start`)
1. Powiedz userowi, zeby w osobnym oknie terminala, w folderze projektu, uruchomil `sdd-board`
   (komenda z instalatora) albo pelna forme:
   `node "${CLAUDE_PLUGIN_ROOT}/board/server.js" requirements/01-interview/board.json`
   i otworzyl w przegladarce http://localhost:8012/board (pod / jest widok postepu; port mozna zmienic drugim argumentem).
   Ty nie uruchamiasz serwera w tle sam, chyba ze user o to poprosi.
2. Jesli `board.json` nie istnieje, utworz go: tytul z `SDD.yaml`, pasy = procesy znane z intake (jesli zadnych, jeden pas "Proces glowny"), `notes: []`.
3. Przyklad gotowej tablicy do nauki: `${CLAUDE_PLUGIN_ROOT}/board/example-zlecenia.json`.

## Format board.json
```json
{ "title": "...", "subtitle": "...", "lanes": ["Pas 1", "Pas 2"],
  "notes": [ { "id": "n01", "type": "ev|cmd|act|pol|rm|hot|space", "text": "...", "lane": "Pas 1",
               "col": 0, "ref": "R-04", "source": "czat Base44, TZ, 2026-09-10 [Biz]",
               "file": "03-spec/PRD.md", "by": "agent",
               "created": "2026-09-26T17:40:00+02:00", "updated": "2026-09-26T17:40:00+02:00" } ] }
```
Typy: `ev` zdarzenie (cos sie stalo), `cmd` komenda (ktos cos robi), `act` kto (rola), `pol` regula (jezeli... to...), `rm` widok (co ktos oglada), `hot` nie wiemy (pytanie),
`space` odstep - puste miejsce oddzielajace elementy na tablicy (tresc nieobowiazkowa); to uklad, nie wymaganie.
`created` / `updated`: data i czas ISO 8601 z czasem lokalnym (`date -Iseconds`). Nowa karteczka: oba pola = teraz. Zmiana tresci, typu, pasa, `ref` albo przeniesienie w inne miejsce: `updated` = teraz, `created` bez zmian.
Samo przenumerowanie kolumn (wstawienie albo zamkniecie kolumny w pasie) nie zmienia `updated`. Panel pokazuje je jako RRRR-MM-DD HH:MM.
`col` to kolejnosc w pasie od lewej (0,1,2...). Karteczki z tym samym `col` stoja jedna pod druga (np. zdarzenie i jego hotspot).

## Tura warsztatu (`/sdd:board` podczas rozmowy)
Po KAZDEJ wypowiedzi usera:
1. Wyciagnij fakty: kto, co robi, co sie dzieje, jaka regula, co oglada.
2. Dopisz karteczki do `board.json` (edytuj plik, zachowaj istniejace). Kazda z `source` (kto powiedzial, data, [Biz]) i `file` (gdzie trafi po warsztacie). `by: "agent"`.
3. Luka, puste "dlaczego", sprzecznosc ze znanym zrodlem -> czerwona `hot` obok karteczki, ktorej dotyczy (ten sam `lane` i `col`). Tresc = pytanie, `ref` = nastepny wolny Q-xxx (sprawdz QUESTIONS.md).
4. Odpowiedz tekstem KROTKO: co postawiles (jedno zdanie) i jedno pytanie doprecyzowujace. Pytaj o przeszlosc, nie o hipotezy.
5. Pomylka w interpretacji: popraw lub usun karteczke, nie dopisuj obok.

Piszesz do board.json sam, bez pytania (odtwarzalne).
User tez edytuje tablice w przegladarce: zaklada procesy (pasy), zmienia ich nazwy i kolejnosc, dopisuje karteczki.
Zawsze czytaj aktualny `board.json` tuz przed edycja i nie przywracaj starych nazw procesow ani usunietych karteczek.

## Synchronizacja po warsztacie (`/sdd:board sync`)
1. Przeczytaj `board.json`. Karteczki z `by: "czlowiek"` lub zmienione recznie (brak `by`, `source` zaczynajace sie od "warsztat, dopisane w przegladarce") to slowa biznesu `[Biz]` o najwyzszej wiarygodnosci.
2. Pomin karteczki `space` (odstepy) - nie trafiaja do plikow i nie dostaja `synced`.
   Zaproponuj mapowanie (i PYTAJ przed zapisem, 3-5 linijek na paczke):
   - `hot` -> wiersze w `QUESTIONS.md` (status `otwarte`, "Skad" = warsztat + data)
   - `act` -> `ACTORS.md`
   - `ev` -> stany w `ENTITIES.md`
   - `pol` -> `RULES.md` jako BR-xxx (+ A niepotwierdzone, jesli zrodlo nie [Biz])
   - `cmd`, `rm` -> kandydaci R do `PRD.md` (sekcja robocza) albo notatka w `session-YYYY-MM-DD.md`
3. Wpisz `ref` z powrotem do karteczek, zeby tablica i pliki mialy te same numery.
   Kazdej karteczce przeniesionej do plikow ustaw `synced` = teraz (ISO, `date -Iseconds`) i `file` = plik, do ktorego trafila.
   Nie zmieniaj przy tym `updated`. Panel pokazuje wtedy ✓; jesli `ref` nie ma w `file` - ! (popraw plik albo ref).
4. `CHANGELOG.md` + 5 linijek podsumowania.

## Odtworzenie tablicy z plikow (`/sdd:board rebuild`)
Zbuduj `board.json` od zera z ACTORS, ENTITIES, RULES, QUESTIONS. Uzywaj, gdy pliki sa dalej niz tablica.

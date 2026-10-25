# Format raportu validate - co czyta panel

## Wiersz kontroli 9
Wiersz kontroli 9 w tabeli wynikow: `| 9 | Pojecia w PRD spoza GLOSSARY | WARN | „Pojecie” (R-xxx), „Pojecie” |` -
pierwsza komorka to numer `9`, przy WARN kazde pojecie w cudzyslowie „…”. Panel czyta ten wiersz: WARN w aktualnym
raporcie cofa etap Domain na "w toku" z lista tych pojec (krok `/sdd:domain`), bo slownik ich nie zna.

## Odcisk wymagan
Pod linia z gotowoscia wpisz odcisk wymagan, liczony na koncu przebiegu (po wszystkich poprawkach):
`node "${CLAUDE_PLUGIN_ROOT}/board/fingerprint.js" requirements` -> linia `Odcisk wymagan: sha256:<hex>`.
Panel porownuje go z biezacym stanem plikow: kazda zmiana wymagan po walidacji oznacza raport jako nieaktualny
i cofa aktualny krok na /sdd:validate. Bez tej linii panel ocenia raport tylko po kolejnosci wpisow w CHANGELOG.

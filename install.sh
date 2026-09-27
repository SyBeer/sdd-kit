#!/usr/bin/env bash
# sdd-kit: pelny instalator (macOS / Linux)
#
# Sposoby uruchomienia:
#   bash install.sh                      z rozpakowanego folderu
#   bash install.sh --update             odswiez po zmianach w kicie
#   bash install.sh --uninstall          usun dodatek i pomocnika
#   curl -fsSL https://raw.githubusercontent.com/<user>/sdd-kit/main/install.sh | SDD_REPO=<user>/sdd-kit bash
#                                        jedna komenda z GitHuba
set -u

SDD_REPO="${SDD_REPO:-}"                 # np. zelu/sdd-kit
MARKET="sdd-kit"
PLUGIN="sdd"
HOME_KIT="$HOME/.sdd-kit"
BIN_DIR="$HOME/.local/bin"
MODE="install"
for a in "$@"; do case "$a" in --update) MODE=update;; --uninstall) MODE=uninstall;; esac; done

hr()  { printf '\n%s\n' "----------------------------------------------------------"; }
say() { printf '%s\n' "$*"; }
ok()  { printf '  [OK]  %s\n' "$*"; }
bad() { printf '  [!!]  %s\n' "$*"; }
ask() { printf '%s ' "$*"; if [ -t 0 ]; then read -r REPLY; else read -r REPLY </dev/tty; fi; }
FAIL=0

# ---------------------------------------------------------------- 0. gdzie jest kit
KIT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/plugins/$PLUGIN/.claude-plugin/plugin.json" ]; then
  KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
elif [ -f "$HOME_KIT/plugins/$PLUGIN/.claude-plugin/plugin.json" ]; then
  KIT_DIR="$HOME_KIT"
fi

# ---------------------------------------------------------------- uninstall
if [ "$MODE" = "uninstall" ]; then
  hr; say "ODINSTALOWANIE sdd-kit"
  if claude plugin uninstall "$PLUGIN@$MARKET" >/dev/null 2>&1; then ok "Dodatek usuniety."; else say "  Dodatek nie byl zainstalowany."; fi
  if claude plugin marketplace remove "$MARKET" >/dev/null 2>&1; then ok "Zrodlo dodatkow usuniete."; else say "  Zrodlo nie bylo zarejestrowane."; fi
  rm -f "$BIN_DIR/sdd-board" && ok "Pomocnik sdd-board usuniety."
  say "  Folder $HOME_KIT zostawiam (usun recznie, jesli chcesz). Pliki requirements/ w projektach nietkniete."
  hr; exit 0
fi

hr
say "INSTALATOR sdd-kit  ($MODE)"
say "Zbieranie wymagan biznesowych z AI (Spec-Driven Development)"
hr
say "Plan: 1 sprawdzam programy -> 2 pobieram kit -> 3 instaluje dodatek -> 4 sprawdzam,"
say "      czy dziala -> 5 dodaje komende sdd-board -> 6 (opcjonalnie) zakladam projekt."
say "Nic nie wysylam poza pobraniem kitu z GitHuba (jesli wybierzesz te opcje)."
[ "$MODE" = "install" ] && ask "Enter, zeby zaczac (Ctrl+C przerywa)."

# ---------------------------------------------------------------- 1. programy
hr; say "KROK 1 z 6: programy"
if command -v claude >/dev/null 2>&1; then ok "Claude Code: $(claude --version 2>/dev/null | head -1)"; else
  bad "Brak Claude Code. To program w terminalu, w ktorym pracuje agent."
  say "      Instalacja: https://docs.claude.com/en/docs/claude-code/overview"; FAIL=1; fi
if command -v claude >/dev/null 2>&1 && claude plugin --help >/dev/null 2>&1; then ok "Claude Code zna komende 'plugin'."; else
  [ "$FAIL" = 0 ] && { bad "Ta wersja Claude Code nie ma komendy 'plugin'. Zaktualizuj Claude Code."; FAIL=1; }; fi
if command -v git >/dev/null 2>&1; then ok "Git: $(git --version | head -1)"; else
  bad "Brak Git. Potrzebny do historii zmian i pobrania kitu z GitHuba."
  say "      macOS: wpisz 'git' w terminalu, system zaproponuje instalacje. Linux: apt/dnf install git"; FAIL=1; fi
if command -v node >/dev/null 2>&1; then ok "Node.js: $(node --version) (tablica warsztatowa bedzie dzialac)"; else
  bad "Brak Node.js. Bez niego nie dziala tablica /sdd:board (reszta tak). https://nodejs.org"; fi
if [ "$FAIL" = 1 ]; then hr; say "Uzupelnij brakujace programy i uruchom instalator ponownie."; exit 1; fi

# ---------------------------------------------------------------- 2. kit
hr; say "KROK 2 z 6: skad kit"
CH=2
if [ -n "$KIT_DIR" ] && [ "$MODE" = "install" ]; then
  say "  Znalazlem kit w: $KIT_DIR"
  say "    1. Uzyj tego folderu (najprostsze)"
  say "    2. Pobierz swiezy z GitHuba do $HOME_KIT (wymaga adresu repo)"
  ask "Wybierz [1]:"; CH="${REPLY:-1}"
elif [ -n "$KIT_DIR" ]; then
  CH=1
fi
if [ "$CH" = "2" ]; then
  if [ -z "$SDD_REPO" ]; then ask "Adres repo w formie uzytkownik/nazwa (np. zelu/sdd-kit):"; SDD_REPO="$REPLY"; fi
  [ -z "$SDD_REPO" ] && { bad "Brak adresu repo. Przerywam."; exit 1; }
  if [ -d "$HOME_KIT/.git" ]; then
    (cd "$HOME_KIT" && git pull -q) && ok "Kit odswiezony z GitHuba." || { bad "git pull nie powiodl sie."; exit 1; }
  else
    git clone -q "https://github.com/$SDD_REPO.git" "$HOME_KIT" && ok "Kit pobrany do $HOME_KIT" || { bad "Nie udalo sie pobrac https://github.com/$SDD_REPO"; exit 1; }
  fi
  KIT_DIR="$HOME_KIT"; SOURCE="$SDD_REPO"
else
  SOURCE="$KIT_DIR"
fi
PLUGIN_DIR="$KIT_DIR/plugins/$PLUGIN"

# ---------------------------------------------------------------- 3. instalacja
hr; say "KROK 3 z 6: instalacja dodatku"
if claude plugin validate "$PLUGIN_DIR" >/tmp/sdd-validate.log 2>&1; then ok "Paczka poprawna."; else
  bad "Kontrola paczki zglosila problemy:"; sed 's/^/      /' /tmp/sdd-validate.log
  ask "Kontynuowac mimo to? [t/N]:"; case "${REPLY:-n}" in t|T) ;; *) exit 1;; esac; fi

if claude plugin marketplace list 2>/dev/null | grep -q "$MARKET"; then
  if claude plugin marketplace update "$MARKET" >/dev/null 2>&1; then ok "Zrodlo '$MARKET' odswiezone."; else ok "Zrodlo '$MARKET' juz zarejestrowane."; fi
else
  if claude plugin marketplace add "$SOURCE" >/tmp/sdd-market.log 2>&1; then ok "Zrodlo '$MARKET' zarejestrowane."; else
    bad "Rejestracja zrodla nie powiodla sie:"; sed 's/^/      /' /tmp/sdd-market.log; exit 1; fi
fi

if claude plugin list 2>/dev/null | grep -qi "$PLUGIN@$MARKET\|^ *$PLUGIN "; then
  if [ "$MODE" = "update" ]; then
    if claude plugin update "$PLUGIN@$MARKET" >/dev/null 2>&1; then ok "Dodatek zaktualizowany."; else ok "Dodatek juz aktualny."; fi
  else ok "Dodatek juz zainstalowany."; fi
else
  if claude plugin install "$PLUGIN@$MARKET" --scope user >/tmp/sdd-install.log 2>&1; then ok "Dodatek zainstalowany dla Twojego uzytkownika."; else
    bad "Instalacja nie powiodla sie:"; sed 's/^/      /' /tmp/sdd-install.log; exit 1; fi
fi

# ---------------------------------------------------------------- 4. weryfikacja
hr; say "KROK 4 z 6: czy dziala"
if claude plugin list 2>/dev/null | grep -qi "$PLUGIN"; then ok "'$PLUGIN' jest na liscie zainstalowanych."; else
  bad "Nie widze '$PLUGIN' na liscie. Sprawdz: claude plugin list"; fi
[ -f "$PLUGIN_DIR/board/server.js" ] && ok "Pliki tablicy sa na miejscu."
SK=$(ls "$PLUGIN_DIR/skills" | wc -l | tr -d ' '); ok "Skilli w paczce: $SK"

# ---------------------------------------------------------------- 5. pomocnik
hr; say "KROK 5 z 6: komenda 'sdd-board'"
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/sdd-board" <<EOF
#!/usr/bin/env bash
# Uruchamia tablice warsztatowa dla projektu w biezacym folderze.
#   sdd-board            -> requirements/01-interview/board.json, port 8012
#   sdd-board plik.json  -> wskazany plik
#   sdd-board --demo     -> jak sdd-board; demo jest zawsze pod /demo (wynik) i /demo/start
KIT="$KIT_DIR/plugins/$PLUGIN/board"
if [ "\${1:-}" = "--demo" ]; then echo "Demo: http://localhost:8012/demo  (start warsztatu: /demo/start)"; exec node "\$KIT/server.js" requirements/01-interview/board.json 8012; fi
exec node "\$KIT/server.js" "\${1:-requirements/01-interview/board.json}" "\${2:-8012}"
EOF
chmod +x "$BIN_DIR/sdd-board"
ok "Zapisano $BIN_DIR/sdd-board"
case ":$PATH:" in
  *":$BIN_DIR:"*) ok "Folder $BIN_DIR jest w PATH, 'sdd-board' dziala od razu.";;
  *) SHRC="$HOME/.zshrc"; [ "$(basename "${SHELL:-zsh}")" = "bash" ] && SHRC="$HOME/.bashrc"
     grep -q '\.local/bin' "$SHRC" 2>/dev/null || printf '\n# sdd-kit\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$SHRC"
     ok "Dopisalem $BIN_DIR do PATH w $SHRC. Otworz nowe okno terminala, zeby 'sdd-board' dzialalo.";;
esac

# ---------------------------------------------------------------- 6. projekt
hr; say "KROK 6 z 6: pierwszy projekt (opcjonalnie)"
if [ "$MODE" = "install" ]; then
  ask "Wskazac teraz folder projektu, w ktorym beda zyc wymagania? [t/N]:"
  case "${REPLY:-n}" in t|T)
    ask "Sciezka (np. ~/projekty/horizon):"; PROJ="${REPLY/#\~/$HOME}"
    if [ -n "$PROJ" ]; then
      mkdir -p "$PROJ" && ok "Folder: $PROJ"
      [ -d "$PROJ/.git" ] || { (cd "$PROJ" && git init -q) && ok "Zalozylem repozytorium Git (historia zmian)."; }
      say ""; say "  Ostatnie dwa kroki robisz sam, bo Claude Code to rozmowa:"
      say "    1. W terminalu:    cd \"$PROJ\" && claude"
      say "    2. W Claude Code:  /sdd:init"
    fi;;
  esac
fi

# ---------------------------------------------------------------- koniec
hr; say "GOTOWE"
say "  W Claude Code (w folderze projektu):"
say "    /sdd:init        zaloz strukture         /sdd:spec       napisz specyfikacje"
say "    /sdd:intake      skataloguj materialy    /sdd:validate   czy mozna budowac"
say "    /sdd:interview   pytania do biznesu      /sdd:handover   przekaz do zespolu"
say "    /sdd:domain      slownik i model         /sdd:status     gdzie jestesmy"
say "    /sdd:board       tablica na zywo (start / sync / rebuild)"
say "  W terminalu:"
say "    sdd-board           postep projektu -> http://localhost:8012, tablica -> /board"
say "    demo:  http://localhost:8012/demo (gotowy modul po SDD)  i  /demo/start (poczatek warsztatu)"
say "    bash install.sh --update      po zmianach w kicie"
say "    bash install.sh --uninstall   usun"
say "  Przewodnik po ludzku: $KIT_DIR/START-TUTAJ.md"
hr

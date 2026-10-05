// Zakladki Modul / Jak to dziala / Konfiguracja (zmiana 0.16.0). Kryteria: docs/specs/info-config.md.
// Odczyt modulu z plikow, tresc przewodnika i bezpieczna edycja SDD.yaml (zachowuje komentarze i uklad linii).
'use strict';
const fs = require('fs');
const path = require('path');
const { readProgress, STAGES } = require('./progress');

const APPROVES = ['R', 'D', 'GLOSSARY', 'BR', 'PRD'];
const BACKLOGS = ['none', 'linear', 'jira', 'redmine', 'file'];
const KINDS = ['monolith', 'service'];  // rodzaj modulu (0.31.0, docs/specs/systems.md czesc B)

// CRLF (Windows) -> \n jak w progress.js (0.27.1, AC-W4)
function read(file) {
  try { return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n'); } catch (e) { return ''; }
}
function yamlField(text, key) {
  const m = text.match(new RegExp('^' + key + ':\\s*"?([^"#\\n]*?)"?\\s*(#.*)?$', 'm'));
  return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------- owners w SDD.yaml
// Blok: linia "owners:" i wciete linie pod nia (do pierwszej niewcietej).
function ownersRange(lines) {
  const start = lines.findIndex(l => /^owners:/.test(l));
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && /^\s+\S/.test(lines[end])) end++;
  return [start, end];
}
function parseOwners(text) {
  const lines = String(text || '').split('\n'), r = ownersRange(lines);
  if (!r) return [];
  const out = [];
  lines.slice(r[0] + 1, r[1]).forEach(l => {
    let m = l.match(/^\s*-\s*role:\s*"?([^"#]*?)"?\s*(#.*)?$/);
    if (m) { out.push({ role: m[1].trim(), approves: [] }); return; }
    m = l.match(/^\s*approves:\s*\[([^\]]*)\]/);
    if (m && out.length) out[out.length - 1].approves = m[1].split(',').map(s => s.trim()).filter(Boolean);
  });
  return out;
}
const quote = v => '"' + String(v).replace(/"/g, "'") + '"';
function cleanOwners(owners) {
  if (!Array.isArray(owners) || !owners.length) throw new Error('Podaj co najmniej jedną rolę.');
  const seen = new Set();
  return owners.map(o => {
    const role = String((o && o.role) || '').replace(/\s+/g, ' ').trim();
    if (!role) throw new Error('Nazwa roli nie może być pusta.');
    if (seen.has(role)) throw new Error('Rola „' + role + '” jest dwa razy.');
    seen.add(role);
    const approves = (Array.isArray(o.approves) ? o.approves : []).map(a => String(a).trim()).filter(Boolean);
    const bad = approves.filter(a => APPROVES.indexOf(a) < 0);
    if (bad.length) throw new Error('Nieznane „zatwierdza”: ' + bad.join(', ') + '. Dozwolone: ' + APPROVES.join(', ') + '.');
    return { role, approves: APPROVES.filter(a => approves.indexOf(a) >= 0) };
  });
}
function ownersSet(text, owners) {
  const list = cleanOwners(owners);
  const lines = String(text).split('\n'), r = ownersRange(lines);
  const block = [];
  list.forEach(o => { block.push('  - role: ' + quote(o.role)); block.push('    approves: [' + o.approves.join(', ') + ']'); });
  if (!r) return String(text).replace(/\n*$/, '\n') + 'owners:\n' + block.join('\n') + '\n';
  return lines.slice(0, r[0] + 1).concat(block, lines.slice(r[1])).join('\n');
}

// Zmiana pola "klucz: wartosc   # komentarz" bez ruszania komentarza (kolumna komentarza zostaje, gdy sie da).
function setLine(text, key, value) {
  const re = new RegExp('^(' + key + ':)( *)(\\S.*?|)( *#.*)?$', 'm');
  const m = text.match(re);
  if (!m) return text.replace(/\n*$/, '\n') + key + ': ' + value + '\n';
  const comment = m[4] ? m[4].trimStart() : '';
  if (!comment) return text.replace(re, key + ': ' + value);
  const width = (m[2] + m[3] + m[4].slice(0, m[4].length - m[4].trimStart().length)).length;
  const pad = Math.max(1, width - 1 - value.length);
  return text.replace(re, () => key + ': ' + value + ' '.repeat(pad) + comment);
}
function yamlSet(text, changes) {
  let out = String(text);
  if ('project' in changes) {
    const p = String(changes.project || '').replace(/\s+/g, ' ').trim();
    if (!p) throw new Error('Nazwa projektu nie może być pusta.');
    out = setLine(out, 'project', quote(p));
  }
  if ('backlog' in changes) {
    if (BACKLOGS.indexOf(changes.backlog) < 0) throw new Error('backlog: dozwolone ' + BACKLOGS.join(', ') + '.');
    out = setLine(out, 'backlog', changes.backlog);
  }
  if ('kind' in changes) {
    if (KINDS.indexOf(changes.kind) < 0) throw new Error('kind: dozwolone ' + KINDS.join(', ') + ' (monolit albo serwis).');
    // projekt sprzed 0.31.0 nie ma linii kind - wstaw pod level, z komentarzem jak w szablonie (AC-SY21)
    const lvl = out.match(/^level:.*$/m);
    if (!/^kind:/m.test(out) && lvl) {
      const col = lvl[0].indexOf('#') > 0 ? lvl[0].indexOf('#') : 23, head = 'kind: ' + changes.kind;
      out = out.replace(/^(level:.*)$/m, () => lvl[0] + '\n' + head + ' '.repeat(Math.max(1, col - head.length)) +
        '# monolith | service - service: wdrazany osobno, rozmawia z reszta tylko przez kontrakt');
    }
    else out = setLine(out, 'kind', changes.kind);
  }
  // Redmine (0.28.4, AC-RM7): adres i identyfikator projektu; klucz API nigdy w SDD.yaml.
  // Wklejony adres projektu (.../projects/<id>) - rozdzielamy sami (AC-RM14).
  changes = Object.assign({}, changes);
  const projOf = v => { const m = String(v || '').match(/(?:^|\/)projects\/([^/?#\s]+)/); return m ? m[1] : String(v || '').trim(); };
  if ('redmine_url' in changes) {
    const m = String(changes.redmine_url || '').trim().match(/^(.*?)\/projects\/([^/?#\s]+)/);
    if (m) {
      changes.redmine_url = m[1];
      const p = projOf(changes.redmine_project);
      if (!p || !/^[a-z0-9][a-z0-9_-]*$/.test(p)) changes.redmine_project = m[2];
    }
  }
  if ('redmine_project' in changes) changes.redmine_project = projOf(changes.redmine_project);
  if ('redmine_url' in changes) {
    const u = String(changes.redmine_url || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^\s/"]+[^\s"]*$/.test(u)) throw new Error('redmine_url: adres musi zaczynać się od http:// albo https://, np. https://redmine.firma.pl.');
    out = setLine(out, 'redmine_url', quote(u));
  }
  if ('redmine_project' in changes) {
    const p = String(changes.redmine_project || '').trim();
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(p)) throw new Error('redmine_project: identyfikator projektu (małe litery, cyfry, - i _), jak w adresie /projects/<identyfikator>.');
    out = setLine(out, 'redmine_project', quote(p));
  }
  return out;
}

// Rola usunieta albo przemianowana, a jej nazwa stoi w plikach wymagan (DECISIONS "Zdecydowal", QUESTIONS "Do kogo"...).
function textFiles(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  entries.forEach(e => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(textFiles(f));
    else if (/\.(md|json|ya?ml|txt)$/i.test(e.name)) out.push(f);
  });
  return out;
}
// Porownanie bez wielkosci liter i polskich znakow - pliki maja role raz z ogonkami, raz bez ("wlasciciel procesu").
const fold = t => String(t).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function roleChangeBlocked(req, oldOwners, newOwners) {
  const keep = new Set((newOwners || []).map(o => fold(String(o.role || '').trim())));
  const gone = (oldOwners || []).map(o => o.role).filter(r => r && !keep.has(fold(r)));
  if (!gone.length) return [];
  const files = textFiles(req).filter(f => path.basename(f) !== 'SDD.yaml').map(f => [f, fold(read(f))]);
  return gone.map(role => ({
    role,
    files: files.filter(x => x[1].includes(fold(role))).map(x => path.relative(req, x[0]).split(path.sep).join('/')).sort(),
  })).filter(x => x.files.length);
}

// ---------------------------------------------------------------- Modul
// Sekcje "## 1. Cel" (PRD) albo "## Cel" (SPEC) - tekst do nastepnego naglowka ##.
function mdSections(md) {
  const out = {};
  let key = null;
  String(md || '').split('\n').forEach(l => {
    const h = l.match(/^##\s+(?:\d+\.\s*)?(.+?)\s*$/);
    if (h) { key = h[1].toLowerCase(); out[key] = []; return; }
    if (key) out[key].push(l);
  });
  Object.keys(out).forEach(k => { out[k] = out[k].join('\n').replace(/<!--[\s\S]*?-->/g, '').trim(); });
  return out;
}
function boardStats(req) {
  let b = null;
  try { b = JSON.parse(read(path.join(req, '01-interview', 'board.json'))); } catch (e) { /* brak tablicy */ }
  const notes = b && Array.isArray(b.notes) ? b.notes.filter(n => n.type !== 'space') : [];
  return { notes: notes.length, synced: notes.filter(n => n.synced).length, lanes: b && Array.isArray(b.lanes) ? b.lanes.length : 0 };
}
function moduleSummary(req) {
  const yaml = read(path.join(req, 'SDD.yaml'));
  const p = readProgress(req);
  const level = p.level || 'full';
  const specFile = level === 'light' ? '03-spec/SPEC.md' : '03-spec/PRD.md';
  const s = mdSections(read(path.join(req, specFile)));
  const c = key => ((p.stages || []).find(x => x.key === key) || {}).counts || {};
  const iv = c('interview'), dm = c('domain'), sp = c('spec');
  return {
    name: path.basename(path.dirname(req)), project: p.project || '', level, kind: p.kind || 'monolith', specFile,
    sections: { cel: s['cel'] || '', zakres: s['zakres'] || '', pozaZakresem: s['poza zakresem'] || '', aktorzy: s['aktorzy'] || '' },
    owners: parseOwners(yaml), gate: yamlField(yaml, 'gate_blocking_status'), backlog: yamlField(yaml, 'backlog') || 'none',
    counts: {
      requirements: sp.requirements || 0, approved: sp.approved || 0, review: sp.review || 0,
      rules: dm.rules || 0, terms: dm.terms || 0, actors: dm.actors || 0, entities: dm.entities || 0,
      systems: dm.systems || 0, critical: dm.critical || 0,
      decisions: iv.decisions || 0, assumptions: iv.assumptions || 0,
      questions: iv.questions || 0, open: iv.open || 0, blockers: (p.blockers || []).length,
    },
    board: boardStats(req),
    next: p.next || null, changelog: p.changelog || [],
  };
}

// ---------------------------------------------------------------- Jak to dziala
const SKILLS = [
  ['/sdd:init', 'Zakłada folder requirements/ z szablonami i CLAUDE.md z zasadami.', 'Na początku, raz na moduł.'],
  ['/sdd:intake', 'Spisuje surowe materiały do INDEX.md, szuka duplikatów i sprzeczności.', 'Po wrzuceniu plików albo wklejeniu maila, notatki.'],
  ['/sdd:interview', 'Zadaje pytania z luk i zapisuje odpowiedzi jako decyzje (D) albo założenia (A).', 'Gdy są otwarte pytania; na żywo albo rundami w plikach.'],
  ['/sdd:domain', 'Buduje słownik pojęć, role, encje ze stanami i reguły biznesowe (BR).', 'Gdy wiadomo już, kto co robi.'],
  ['/sdd:spec', 'Pisze wymagania (R) ze źródłem i kryteriami akceptacji (AC) w formie Given/When/Then.', 'Po zatwierdzeniu słownika.'],
  ['/sdd:validate', 'Sprawdza źródła, kryteria i sprzeczności, liczy procent gotowości.', 'Przed przekazaniem do budowy.'],
  ['/sdd:handover', 'Zamienia wymagania na zadania i tabelę śledzenia: wymaganie (R) → zadanie → test.', 'Gdy walidacja ma 100%.'],
  ['/sdd:board', 'Tablica warsztatowa: karteczki na żywo, potem sync do plików.', 'Na warsztacie i po nim („sync”).'],
  ['/sdd:status', 'Stan w 20 linijkach: liczby, co blokuje, co czeka na biznes.', 'Przed spotkaniem.'],
];
const FOLDERS = [
  ['00-intake/', 'Surowiec: maile, notatki, PDF-y i spis INDEX.md. Nie jest prawdą, tylko źródłem.'],
  ['01-interview/', 'Pytania (QUESTIONS), decyzje (DECISIONS), założenia (ASSUMPTIONS), sesje i tablica board.json.'],
  ['02-domain/', 'Model: słownik (GLOSSARY), role (ACTORS), encje (ENTITIES), reguły (RULES), systemy (SYSTEMS). To jest prawda o domenie.'],
  ['03-spec/', 'Wymagania: PRD.md (poziom pełny) albo SPEC.md (lekki).'],
  ['04-validation/', 'Raporty walidacji z procentem gotowości.'],
  ['CHANGELOG.md, SDD.yaml', 'Historia zmian wymagań i ustawienia procesu (role, poziom, backlog).'],
];
const SECTIONS = [
  { title: 'Źródła i wiarygodność', items: [
    '[Biz] – wypowiedź biznesu (cytat, data, kto). Najwyższa wiarygodność.',
    '[App] – działająca aplikacja, system albo prototyp (zaobserwowane zachowanie).',
    '[Dok] – dokument spisany z kodu albo przez model.',
    '[AI] – interpretacja modelu; musi wrócić do biznesu jako pytanie albo założenie.',
    'Kolejność: [Biz] → [App] → [Dok] → [AI]. Wyższe źródło wygrywa, a różnica trafia do QUESTIONS.md jako „sprzeczne” - Claude nie rozstrzyga jej po cichu.',
    'Decyzja (D) powstaje tylko ze słów biznesu [Biz]. To, co wynika z kodu albo dokumentu, jest założeniem (A) do potwierdzenia - inaczej błąd z kodu stałby się „decyzją”, której nikt już nie podważa. Walidacja blokuje D bez [Biz]. Żeby nie zasypać biznesu pytaniami: przy istniejącej aplikacji jedna decyzja „akceptacja as-built” (z wyjątkami), a resztę biznes potwierdza hurtowo jedną listą.'] },
  { title: 'Identyfikatory i statusy', items: [
    '**Q** – pytanie.',
    '**D** – decyzja.',
    '**A** – założenie.',
    '**BR** – reguła biznesowa.',
    '**S** – system, z którym aplikacja wymienia dane (SYSTEMS.md).',
    '**R** – wymaganie.',
    '**AC** – kryterium akceptacji.',
    '**PRD** – dokument wymagań dla biznesu.',
    'Statusy: robocze → zatwierdzone; zakwestionowane (Q-xxx), gdy nowe źródło podważa element modelu.',
    'Zmiana decyzji albo reguły uruchamia kaskadę: powiązane **R** wracają „do przeglądu”.'] },
  { title: 'Rodzaj modułu i kontrakt', items: [
    'Rodzaj modułu ustawiasz raz (Konfiguracja albo /sdd:init): monolit - aplikacja wdrażana w całości; serwis - wdrażany osobno, z własnymi danymi, rozmawia z resztą tylko przez kontrakt. Pytanie rozstrzygające: czy ta część jest wdrażana osobno i inne mogą z nią rozmawiać tylko przez kontrakt?',
    'Kontrakt to wymaganie (R rodzaju „kontrakt”, wejście albo wyjście) z kryteriami językiem biznesu: jakie dane, kierunek, częstotliwość albo dopuszczalne opóźnienie, co przy awarii; przy serwisie także zmiana wersji. Schemat techniczny (OpenAPI, AsyncAPI) powstaje w budowie i wskazuje R.',
    'Monolit: kontrakt dla integracji zewnętrznych, brak go - ostrzeżenie. Serwis: kontrakt także dla własnego API i każdego konsumenta, brak - blokada; zadanie z kontraktem nie przejdzie do „done” bez testu kontraktowego.',
    'Kontrakt między dwoma serwisami uzgadniają właściciele obu stron - to decyzja biznesu [Biz], nie odczyt z kodu.'] },
  { title: 'Systemy i integracje', items: [
    'SYSTEMS.md to rejestr systemów: kto jest właścicielem integracji, który system jest źródłem prawdy (master) dla jakich danych, kierunek i częstotliwość wymiany, co robimy przy awarii.',
    'Mapa systemów (diagram) powstaje z tabeli - aplikacja w środku, wokół systemy zewnętrzne i ręczne (Excel, mail).',
    'Proces systemowy (diagram sekwencji z gałęzią awarii) - tylko dla integracji krytycznych, bez których proces biznesowy staje.',
    'Opisuje CO, nie JAK: dane i zachowanie widziane przez biznes, bez protokołów i endpointów.',
    'Walidacja blokuje dwa systemy jako źródło prawdy dla tych samych danych i ostrzega o integracji bez właściciela albo bez zachowania przy awarii.'] },
  { title: 'Tablica warsztatowa', items: [
    'Karteczki: zdarzenie, komenda, kto, reguła, widok, „nie wiemy” (pytanie).',
    'Tablica to widok, pliki w requirements/ są prawdą. Po warsztacie /sdd:board sync przenosi karteczki do plików.',
    'Znaczniki: ✓ w plikach, ↻ zmieniona po synchronizacji, ! numeru nie ma w pliku.',
    'Karteczki dopisane w przeglądarce są słowami biznesu [Biz].'] },
  { title: 'Panel i serwer', items: [
    'Serwer uruchamiasz komendą sdd-board w folderze modułu (albo z HQAI); zostaw okno terminala otwarte.',
    'Panel, tablica i te zakładki odświeżają się same, gdy Claude zmienia pliki.',
    'Komend wymagających rozmowy nie uruchamia się z panelu - kopiujesz je do Claude Code.',
    'Przycisk Claude w górnym pasku otwiera Claude Code w oknie z prawej, w folderze modułu (macOS / Linux, potrzebny Python 3). Sesja działa dalej przy przejściu między zakładkami; kończy ją przycisk Zakończ albo zatrzymanie serwera.'] },
  // Integracja z Redmine (0.28.8; wtyczka UAT 0.28.14, AC-RM20; prosba usera: "dopisz w Jak to dziala sposob dzialania integracji z Redmine")
  { title: 'Integracja z Redmine', items: [
    '**Ustawienie** – Konfiguracja: backlog „redmine”, adres Redmine, projekt (można wkleić adres projektu z przeglądarki) i klucz API. W SDD.yaml modułu dodatkowo: redmine_ac_field (pole na kryteria akceptacji, np. „Kryteria akceptacji”), redmine_uat_link (link do środowiska UAT wpisywany w każde zadanie, pole „Link do środowiska UAT” albo redmine_uat_field), opcjonalnie redmine_tracker, redmine_status_start, redmine_status_done.',
    '**Klucz API** – zapisany w ~/.sdd-kit/.env na tym komputerze (Mac i Windows). Czyta go tylko sdd-kit; Claude go nie otwiera, a panel pokazuje tylko, czy jest ustawiony. Klucz bierzesz z Redmine: Moje konto → Klucz dostępu do API.',
    '**Przekazanie** – /sdd:handover sprawdza połączenie, przygotowuje listę zadań, pokazuje ją i czeka na zgodę. Dopiero potem zakłada zadania: temat [R-xxx], opis z tabelą kryteriów Given / When / Then, zrzuty ekranu z 00-intake/, kryteria w polu projektu, zależności „poprzedza”. Każde zadanie ma dopisek „Wygenerowane przez AI [Claude Code]”.',
    '**Ponowne przekazanie** – po zmianie wymagań aktualizuje te same zadania (numery z TRACEABILITY.md), nie zakłada nowych i nie dubluje załączników. Zadań usuniętych z wymagań nie zamyka – wypisuje je do decyzji.',
    '**Pliki lokalne** – zostają: 04-validation/redmine-RRRR-MM-DD.json (co wysłano) i TRACEABILITY.md (wymaganie → kryterium → #zadanie w Redmine → test). Wymagania w plikach są dalej prawdą; zadanie w Redmine to ich kopia dla zespołu.',
    '**Agent budujący aplikację** – pracuje na plikach 03-spec/agent/*/tasks.md, nie na opisach w Redmine. Status zmienia przez /sdd:handover status #numer: start („W realizacji”), done („Code review”, z commitem i kryteriami). Komentarz ma dopisek „Wygenerowane przez AI [Claude Code]”. Statusy UAT, zamknięcie i odrzucenie ustawia człowiek.',
    '**Testy UAT (wtyczka w Redmine)** – osobny projekt, nie część sdd-kit: wtyczka uat_tests instalowana w samym Redmine (github.com/SyBeer/redmine-UAT-plugin). Gdy człowiek ustawi zadanie na „Gotowy do UAT”, wtyczka robi z pola „Kryteria akceptacji” podzadania typu „Test UAT” – jedno kryterium AC-xxx-n to jeden przypadek do kliknięcia przez biznes – i nie pozwala zaakceptować UAT, dopóki któryś przypadek nie jest zaliczony. Format kryteriów z /sdd:handover jest z nią zgodny. Agent kończy na „Code review”; „Gotowy do UAT” ustawia człowiek. Link do środowiska testowego, którego wymaga przepływ, /sdd:handover wpisuje sam, gdy w SDD.yaml jest redmine_uat_link.',
    '**Gdy coś nie działa** – Redmine może wymagać pola kryteriów przy zmianie statusu (ustaw redmine_ac_field i powtórz /sdd:handover); „Redmine nie pozwolił na przejście” oznacza, że przepływ pracy Twojej roli w Redmine nie dopuszcza tej zmiany.'] },
];
// Warianty komend (AC-C20): tylko to, co jest w skills/<nazwa>/SKILL.md - test pilnuje zgodnosci.
const VARIANTS = {
  '/sdd:init': [['/sdd:init --light', 'Poziom lekki bez pytania: jeden krótki SPEC.md zamiast dokumentu wymagań (PRD).']],
  '/sdd:intake': [
    ['/sdd:intake', 'Domyślnie: nowe pliki z 00-intake/. Eksport czatu z narzędzia no-code (Base44, Lovable) rozbija na polecenia biznesu, odpowiedzi AI i dokumentację.'],
    ['/sdd:intake --message', 'Wklejona wiadomość (mail, Teams): zapisuje ją jako plik w 00-intake/ i od razu katalogi.']],
  '/sdd:interview': [
    ['/sdd:interview live', 'Warsztat na żywo: jedno pytanie naraz, odpowiedź zapisywana od razu (dobrze działa razem z tablicą).'],
    ['/sdd:interview async', 'Rundy w plikach: pytania do każdej roli w Q-round-N-<rola>.md z terminem; potem wklejasz odpowiedzi.']],
  '/sdd:domain': [
    ['/sdd:domain', 'Także przebudowa modelu, gdy /sdd:intake zgłosi, że nowe źródło podważa słownik, encje albo reguły.'],
    ['/sdd:domain zatwierdz', 'Zatwierdzanie słownika przez biznes: hasła paczkami, „zatwierdzam” - bez tego /sdd:spec nie ruszy.']],
  '/sdd:spec': [
    ['/sdd:spec', 'Domyślnie: dokument wymagań (PRD) dla biznesu - wymagania proponowane paczkami, każde z Twoim „tak”.'],
    ['/sdd:spec --agent', 'Pliki dla agenta, który będzie budował (03-spec/agent/): generowane z zatwierdzonych wymagań.'],
    ['/sdd:spec --light', 'Jeden krótki SPEC.md, do małych rzeczy.']],
  '/sdd:validate': [],
  '/sdd:handover': [['/sdd:handover', 'Cel backlogu bierze z Konfiguracji: plik, Linear, Jira albo Redmine (adres i projekt w Konfiguracji, klucz API poza plikami).'],
    ['/sdd:handover status', 'Redmine: agent budujący aplikację ustawia status zadania - start („W realizacji”) i done („Code review”, z commitem i kryteriami); komentarz z dopiskiem „Wygenerowane przez AI [Claude Code]”. UAT i zamknięcie robi człowiek.']],
  '/sdd:board': [
    ['/sdd:board', 'W trakcie rozmowy: po każdej wypowiedzi biznesu AI stawia karteczki i pyta o jedną rzecz.'],
    ['/sdd:board start', 'Jak uruchomić tablicę i założyć board.json dla modułu.'],
    ['/sdd:board sync', 'Po warsztacie: karteczki i odpowiedzi z tablicy trafiają do plików - AI proponuje, Ty zatwierdzasz.'],
    ['/sdd:board rebuild', 'Buduje tablicę od zera z plików (role, encje, reguły, otwarte pytania), gdy pliki są dalej niż tablica.'],
    ['/sdd:board processes', 'Istniejąca aplikacja: rozpisuje jej procesy na karteczki (kto, co robi, reguła, efekt, ekran) ze źródłem w kodzie; rozjazdy z dokumentacją jako czerwone pytania.']],
  '/sdd:status': [['/sdd:status --file', 'To samo podsumowanie, zapisane też do requirements/STATUS.md.']],
};
// Dwa punkty startu (AC-C19).
const STARTS = [
  { title: 'Od materiałów', lead: 'Masz maile, notatki, dokumenty albo eksport czatu z prototypu.', steps: [
    'Wrzuć pliki na kartę Intake w Panelu (albo wklej wiadomość w Claude Code: /sdd:intake --message).',
    'W Claude Code: /sdd:intake - AI spisuje materiały i szuka sprzeczności.',
    'Dalej po kolei: /sdd:interview → /sdd:domain → /sdd:spec → /sdd:validate → /sdd:handover. Panel pokazuje, który krok teraz.',
    'Tablicę możesz dołożyć w każdej chwili: /sdd:board rebuild zbuduje ją z plików.'] },
  { title: 'Od tablicy warsztatowej', lead: 'Nie ma jeszcze materiałów albo chcesz zacząć od rozmowy z biznesem.', steps: [
    'Otwórz Tablicę: załóż procesy i karteczki sam albo z AI - w Claude Code /sdd:board prowadzi warsztat i stawia karteczki.',
    'Po warsztacie w Claude Code: /sdd:board sync - karteczki trafiają do plików (pytania, role, stany, reguły, kandydaci na wymagania), każda paczka z Twoim „tak”.',
    'Panel liczy postęp z plików - dalej /sdd:domain i /sdd:spec jak w pierwszej drodze.',
    'Materiały dorzucisz później: /sdd:intake porówna je z tym, co już ustaliliście.'] },
];
const BOARD_SYNC = { title: 'Tablica i panel', items: [
  'Tablica to widok, pliki w requirements/ to prawda. Panel i zakładka Moduł liczą wszystko z plików.',
  'Z tablicy do plików przenosi tylko Claude Code: /sdd:board sync (AI proponuje, Ty zatwierdzasz). Bez tego karteczka zostaje „tylko na tablicy”.',
  'Z plików na tablicę: pytania z QUESTIONS.md dokładasz przyciskiem „Dołóż” w pasku Pytania; pytania zamknięte w pliku szarzeją same; całość z plików - /sdd:board rebuild.',
  'Odpowiedzi wpisane na tablicy czekają na zapis - /sdd:board sync zamienia je na decyzje albo założenia.',
  'Znaczki na karteczkach (✓ w plikach, ↻ zmienione, ! brak w pliku) pokazują zgodność z plikami na żywo.'] };

function guide() {
  return {
    stages: STAGES.map(s => ({ key: s.key, name: s.name, command: s.command, desc: s.desc, howto: s.howto })),
    starts: STARTS,
    skills: SKILLS.map(s => ({ command: s[0], desc: s[1], when: s[2],
      variants: (VARIANTS[s[0]] || []).map(v => ({ command: v[0], desc: v[1] })) })),
    folders: FOLDERS.map(f => ({ path: f[0], desc: f[1] })),
    sections: [BOARD_SYNC].concat(SECTIONS),
  };
}

// ---------------------------------------------------------------- Konfiguracja
// Moduly z obecnej listy, ktorych nie bedzie widac po zmianie katalogu (dodane recznie zostaja).
function rootPreview(mods, newRoot) {
  const r = path.resolve(String(newRoot || ''));
  return (mods || []).filter(m => !m.external && path.dirname(path.resolve(m.dir)) !== r).map(m => m.name);
}

module.exports = { APPROVES, BACKLOGS, KINDS, parseOwners, ownersSet, yamlSet, roleChangeBlocked, mdSections, moduleSummary, guide, rootPreview, yamlField };

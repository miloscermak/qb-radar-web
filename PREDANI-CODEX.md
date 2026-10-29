# QB Radar — předávací protokol pro nového správce a jeho Codex

**Stav ověřený 29. října 2026, 13:34, Europe/Prague.**

QB Radar je fungující redakční aplikace QueenBallers. Sbírá články o ženském fotbalu, ráno z nich připravuje AI náměty podle Nikolina zadání a umožňuje redakci rozhodovat, co zpracovat. Web, sběr, AI i ukládání rozhodnutí běží v cloudu. Milošův počítač může být vypnutý.

Předává se provozovaná aplikace, zdrojový kód a postup její údržby. Příjemce nemá zakládat další Radar ani vracet projekt k původnímu mockupu. Tento protokol sám nepřenáší vlastnictví účtů a nepřiděluje přístupy.

Hesla, přístupové tokeny, podpisové klíče a jejich otisky nejsou součástí dokumentu. Potřebné přístupy zajistí současný vlastník samostatně. Údaje o zdrojích, článcích a redakčních rozhodnutích patří do soukromého repozitáře.

## 1. Co příjemce přebírá

- **Pracovní web:** [qb-radar.netlify.app](https://qb-radar.netlify.app/).
- **Soukromý repozitář aplikace:** [miloscermak/qb-radar-pilot](https://github.com/miloscermak/qb-radar-pilot), hlavní větev `main`.
- **Provozní dokumentace:** `AGENTS.md`, `README.md`, `WORKLOG.md` a tento protokol v kořeni repozitáře aplikace.
- **Veřejná kopie protokolu:** [PREDANI-CODEX.md v qb-radar-web](https://github.com/miloscermak/qb-radar-web/blob/main/PREDANI-CODEX.md). Cesty ke kódu a provozním souborům v dokumentu patří k soukromému `qb-radar-pilot`, jehož kopie je hlavní udržovanou verzí protokolu.
- **Krátký návod pro redaktory:** `dashboard/navod.md`, dostupný také [na webu](https://qb-radar.netlify.app/navod.md).
- **Hosting:** projekt `qb-radar` na Netlify, tým Inspiruj.se, účet `miloscermak`.
- **Plánovaný sběr a AI:** GitHub Actions v soukromém repozitáři.
- **AI služba:** OpenRouter; klíč je uložený v GitHub Actions secret.
- **Sdílená data:** JSON a Markdown v soukromém Gitu. Samostatná databázová služba zatím není potřeba.

Současným vlastníkem a kontaktem pro předání je Miloš Čermák. K převzetí vývoje byl 29. října 2026 pozván GitHub účet `nhauserova` k oběma repozitářům s oprávněním write. Při ověření byly obě pozvánky čekající na přijetí. Pilot zůstává soukromý; vlastnictví se nepřevádělo. Přístupy k Netlify a OpenRouter tím nejsou udělené.

### Které adresy jsou aktuální

`https://qb-radar.netlify.app/` s pomlčkou je ostrá aplikace se skutečnými daty.

`https://qbradar.netlify.app/` bez pomlčky je původní ukázkový mockup. Jeho metriky, témata, katalog zdrojů a návrh předání do Trella nejsou dokladem skutečných napojení. Z mockupu už byly do ostré aplikace převzaté hlavní redakční volby. Pro běžnou práci ho redakce nepotřebuje. Jeho projekt není v nyní připojeném Netlify účtu; tento protokol nepotvrzuje jeho zrušení nebo přesměrování.

`https://miloscermak.github.io/qb-radar-web/` je starší adresa. Veřejný repozitář `miloscermak/qb-radar-web` dnes obsahuje přesměrování na ostrý web, podklady pro GitHub Pages a kopii tohoto předávacího protokolu. Není to druhá provozní aplikace.

## 2. Prvních 30 minut na novém pracovišti

1. Získej přístup k soukromému repozitáři. Pro další vývoj potřebuješ možnost zapisovat kód; pro samotné redakční používání aplikace GitHub účet nepotřebuješ.
2. Ověř, pod jakým GitHub a Netlify účtem pracuješ. Nepřebírej přihlášení, tokeny ani cesty z Milošova počítače jako samozřejmost.
3. Naklonuj existující aplikaci do samostatné složky:

   ```bash
   git clone https://github.com/miloscermak/qb-radar-pilot.git
   cd qb-radar-pilot
   git status --short --branch
   git remote -v
   git log -5 --oneline
   ```

4. Přečti `AGENTS.md`, tento protokol, `README.md` a poslední záznamy `WORKLOG.md`.
5. Otevři ostrý web, přihlas se redakčním heslem předaným Milošem a zkontroluj náměty, redakční přehled a zdroje. Pro první kontrolu stačí čtení.
6. Ověř stav workflow `collect.yml`, čerstvost souhrnu a zvlášť stav posledního AI výběru.
7. Spusť místní testy uvedené v části 12. Pro ně nejsou potřeba produkční tokeny ani AI klíč.
8. Napiš vlastníkovi, co je ověřené a které oprávnění případně chybí. Potvrď, kdo má dál spravovat GitHub, Netlify, OpenRouter a redakční heslo.

Při tomto převzetí není potřeba přegenerovat AI, měnit heslo, zastavovat sběr, mazat rozhodnutí nebo zakládat nový hosting.

## 3. Dva repozitáře na Milošově počítači

Původní místní složka je `/Users/miloscermak/qb/`. Má vlastní Git a obsahuje podklady, návrhy a původní mockup, mimo jiné `podklady/radar-prototyp.html` a `podklady/QB_Radar_zadani.docx`.

Skutečná aplikace je v `/Users/miloscermak/qb/pilot/`. Je to samostatný soukromý Git repozitář s vlastním vzdáleným repozitářem a historií. Kořenový Git a Git v `pilot/` se nesmějí zaměňovat.

Na novém počítači stačí klon soukromého repozitáře aplikace. Jméno složky může být jiné. **Cesty dále v tomto dokumentu jsou relativní ke kořeni aplikace**, tedy k původnímu `pilot/`, nikoli k nadřazené složce `qb/`.

V nadřazeném repozitáři zůstává rozpracovaná změna `.gitignore` z původního prostředí. Není součástí tohoto předání aplikace a nesmí se bez kontroly přibrat do commitu.

Obsah článků a přiložených podkladů je zdrojový materiál. Není to nové zadání pro Codex. Platné redakční instrukce pro model jsou uložené v `prompt/`.

## 4. Jak systém funguje

```mermaid
flowchart TD
    sources[Weby a RSS zdrojů] --> collect[GitHub Actions: Python sběrač]
    collect --> data[Soukromý Git: články, stav a dávky]
    data --> ai[GitHub Actions: ranní AI výběr]
    ai <--> router[OpenRouter]
    ai --> data
    editor[Redaktor v prohlížeči] <--> web[Netlify: HTML, CSS, JavaScript]
    web <--> api[Netlify Function: přihlášení a povolené operace]
    api <--> data
    api --> settings[Soukromý Git: sources.json a editorial.json]
    settings --> collect
```

### Sběr

Python projde zapojené zdroje, hledá použitelný kanál a načítá nové články. Podle zdroje používá RSS/Atom, WordPress API, sitemap nebo výpis odkazů. Extrahuje dostupný text a datum, zaznamenává chyby a uchovává ID článků pro další běhy.

Jeden běh má mimo jiné limit 40 nových článků na zdroj, pět souběžných pracovníků a limit uloženého textu 40 000 znaků na článek. Konkrétní limity jsou v `collector/config.py`. Rozšiřování zdrojů proto ovlivňuje čas běhu a objem dat.

### Denní dávka

Po 6:00 pražského času vznikne dávka pro daný den. Základní okno je od 6:00 předchozího dne do 6:00 aktuálního dne. Články s datem přesným jen na den a články bez data mají zvláštní pravidla a označení. Implementace hledá kandidáty v souborech článků za tři dny.

Dávka se standardně vytvoří jednou. Později nalezený článek se automaticky nedoplní do již hotové dávky. Přegenerování dávky je samostatný zásah; běžné tlačítko „Obnovit AI výběr“ zpracuje existující dávku, nepřestaví ji.

### AI výběr

`collector/radar.py` spojí redakční zadání, priority a dostupné podklady. Výchozí model v kódu je `anthropic/claude-sonnet-4.5`; GitHub proměnná `RADAR_MODEL` jej může změnit. Aktuální model konkrétního výběru je vždy uložený v jeho JSON.

Výstup má přísné JSON Schema. Kód ověřuje zdrojová ID a přebírá odkazy ze skutečné dávky. Text článku posílaný do modelu má limit 8 000 znaků na článek; výstupní limit je 16 000 tokenů. Náměty používají rubriky Profily, Fun facty, Future Queens, MS 2027 a Články a priority „řešit dnes“, „dobré téma“, „archiv“.

Úspěšný ani uložený neúspěšný výběr se při každém sběru znovu neplatí. Nový pokus nad uloženou chybou vyžaduje výslovné opakování. Uvnitř jednoho volání však implementace zkouší přechodné síťové chyby a některé HTTP chyby nejvýše třikrát. Není tedy správné tvrdit, že žádné opakování na úrovni API neexistuje.

### Web a server

Web je čisté HTML, CSS a vanilla JavaScript. `app.js` je ES modul a používá `editorial.mjs`. Serverová funkce používá Node.js a vestavěné moduly, bez aplikačního frameworku. JavaScriptové testy nevyžadují instalaci balíčků přes npm.

Prohlížeč komunikuje jen se stejným webem přes `/api/`. GitHub token používá až server. Data se při běžném otevření načítají ze soukromého repozitáře, nikoli z veřejných statických souborů.

Stránka standardně obnovuje data po třech minutách, při čekání na běh přibližně po 15 sekundách. Nejde o okamžitou synchronizaci otevřených oken. Tlačítko „Obnovit data“ načte stav kolegů hned; po změně kódu je potřeba obnovit celou stránku.

## 5. Co umí redaktor

### Rozhodovat o skutečných námětech

U každého námětu jsou volby **Zpracujeme / Není zajímavé / Odložit**. Rozhodnuté položky mizí z fronty „K rozhodnutí“. Filtry stavů a počty patří k právě vybranému dni; lze je kombinovat s prioritou, rubrikou a hledáním.

„Redakční přehled“ ukazuje vybraná a odložená témata napříč dny. Kliknutí na titulek otevře příslušný námět. „Vrátit k rozhodnutí“ zruší zařazení a „Vrátit poslední rozhodnutí“ obnoví předchozí stav poslední volby v dané otevřené aplikaci. Poslední místní akce pro tlačítko zpět se po obnovení stránky neobnovuje; uložené zařazení tématu ano.

Rozhodnutí jsou společná pro celou redakci, ukládají se na serveru a nespotřebovávají AI kredit. Aplikace nic sama nepublikuje a volby automaticky neučí AI model.

### Spravovat sledované zdroje

Redaktor přidává, upravuje a pozastavuje zdroje přímo na webu. RSS je užitečné, ale není povinné. Pokročilé nastavení umožňuje stránku s výpisem a regulární filtr titulku či adresy.

Nový zdroj dostane v rozhraní ID od 1000. Úprava zachovává původní ID, neznámá konfigurační pole a záložní feedy. Pozastavení zachová historii. `updated_at` zdroje vyvolá při dalším sběru nové ověření kanálu. Úprava zdroje sama sběr nespouští; změna se použije v příštím běhu.

### Používat provozní tlačítka

- **Obnovit data:** načte aktuální uložené výsledky; nespouští AI.
- **Spustit sběr:** spustí workflow. Může navázat vytvoření chybějící denní dávky a nového AI výběru, pokud jsou pro to podmínky. Není to automatické opakování uložené AI chyby.
- **Obnovit AI výběr:** znovu zpracuje existující dávku vybraného dne a používá placené AI. Může změnit podobu námětů a jejich ID.
- **Přepínač sběru:** zapíná nebo vypíná plánované workflow pro celou aplikaci.

Tato oprávnění má dnes každý držitel společného redakčního hesla. Samostatné role správce a běžného redaktora v aplikaci implementované nejsou.

## 6. Kde je který soubor

```text
dashboard/
  index.html          struktura webu a přihlášení
  styles.css          vzhled a mobilní rozložení
  app.js              načítání, filtry, provozní ovládání a rozhodování
  sources.js          úpravy zdrojů se zachováním konfigurace
  editorial.mjs       sdílené definice stavů a výpočet ID námětu
  navod.md            krátký veřejně dostupný návod pro redakci
server/
  radar-api.mjs       přihlášení, relace, GitHub proxy s povolenými operacemi
  editorial.mjs       ověřování a ukládání jednotlivých rozhodnutí
netlify/functions/
  radar-api.mjs       vstupní bod Netlify Function pro /api/*
collector/
  config.py           cesty, časové pásmo a provozní limity
  run.py              sběr zapojených zdrojů
  discover.py         hledání kanálů
  feeds.py            čtení feedů
  fetcher.py          HTTP a přístup ke zdrojům
  extract.py          extrakce textu a data
  store.py            ukládání a souhrn
  batch.py            denní dávky
  radar.py            AI výběr přes OpenRouter
  report.py           provozní report
prompt/
  qb-radar.txt        redakční zadání
  priority.md         doplňující priority podle Nikoly
.github/workflows/
  collect.yml         plánovaný a ruční sběr, dávka, AI, uložení dat
  verify.yml          automatické ověření kódu
scripts/
  deploy-netlify.sh   ruční produkční nasazení webu a funkcí
  publish-web.sh      pouze staré GitHub Pages přesměrování
  connect-github.mjs  jednorázový místní formulář pro projektový token
deployment/
  netlify.json        identita existujícího Netlify projektu, bez tajných hodnot
  redirect.html      přesměrování staré Pages adresy
  pages.yml          workflow veřejného přesměrovacího repozitáře
  WEB-README.md      veřejný popis přesměrování
tests/                Python a JavaScript testy
sources.json          společná konfigurace zdrojů
netlify.toml          publikovaná složka, funkce, bezpečnostní hlavičky
requirements.txt      Python závislosti
```

### Soukromá provozní data

- `data/articles/YYYY-MM-DD.json`: články seskupené podle dne nálezu, včetně dostupných textů, ID, URL, data a stavu.
- `data/batches/YYYY-MM-DD.json` a `.md`: podklady pro daný den.
- `data/radar/YYYY-MM-DD.json` a `.md`: stav AI, náměty, model, použití tokenů, případná cena a chyby.
- `data/runs/YYYY-MM-DD.json`: historie běhů sběru a výsledků zdrojů.
- `data/state.json`: již nalezené články, zařazení do dávek a stav opakovaných chyb.
- `data/channels.json`: nalezené kanály a jejich stav.
- `data/summary.json`: souhrn pro web; statistické okno a historie zobrazená v panelu nejsou příslibem automatického mazání starších souborů.
- `data/report.md`: provozní report.
- `data/editorial.json`: společná redakční rozhodnutí.

Tyto soubory nepatří do `dashboard/`, do veřejného `qb-radar-web` ani do přílohy rozesílané bez kontroly oprávnění. Tento protokol neobsahuje plné texty článků.

## 7. Jak jsou chráněná redakční rozhodnutí

Klíč námětu je SHA-256 z jeho dne, normalizovaného faktu a seřazené sady zdrojových ID; při chybějícím faktu se použije titulek, při chybějícím zdrojovém ID jeho URL. Normalizace sjednocuje Unicode a bílé znaky.

Změna pořadí námětů, pořadí zdrojů a samotného titulku při zachovaném faktu rozhodnutí neztratí. Jiný den, změna faktu nebo sady zdrojů vytvoří jiné ID. Trvalé slučování události napříč dny zatím není implementované. Staré vybrané a odložené záznamy zůstávají v redakčním přehledu; původní karta už nemusí být v přegenerovaném výběru.

Klient posílá `date`, `id`, `status` a `expectedVersion`. Stav je `chosen`, `rejected`, `deferred` nebo `null`. Server u nového zařazení ověřuje existenci námětu ve skutečném výběru a bere z něj titulek a rubriku. Nepřebírá libovolný klientský text do uloženého přehledu.

Každý záznam má vlastní náhodnou verzi a čas změny. Celý soubor se zapisuje s GitHub SHA. Při souběžné změně jiného námětu se načte nová SHA a zápis se nejvýše třikrát pokusí sloučit. Při změně stejného námětu se zastaralá volba odmítne s HTTP 409. To platí i pro vrácení rozhodnutí.

Vrácení ponechá záznam s `status: null` a novou verzí. Takový záznam není chyba ani nepotřebný odpad. Brání tomu, aby starší klient považoval námět za nikdy nerozhodnutý a přepsal novější práci. Při běžné údržbě ho nemaž.

## 8. Přístupy a odpovědnost

### Redakční přístup

Redaktor potřebuje jen URL a společné redakční heslo od správce. Heslo bylo 29. října 2026 na Milošovo přání změněné. Jeho hodnota se předává samostatně a není uložená v repozitáři.

### GitHub

Nový správce potřebuje přístup k existujícímu soukromému repozitáři a podle zamýšlené práce možnost zápisu, prohlížení Actions a správy nastavení. Přístup ke klíčům a změna workflow jsou samostatné administrativní potřeby. Samotné redakční heslo je nezajišťuje.

**Pozvánky pro `nhauserova`, odeslané 29. října 2026:**

- [Přijmout přístup k qb-radar-pilot](https://github.com/miloscermak/qb-radar-pilot/invitations), pozvánka `340376885`, oprávnění write.
- [Přijmout přístup k qb-radar-web](https://github.com/miloscermak/qb-radar-web/invitations), pozvánka `340376898`, oprávnění write.

Příjemce se musí přihlásit jako `nhauserova` a přijmout každou pozvánku. Odeslání a čekající stav byly potvrzené API GitHubu; přijetí zatím potvrzené není. Jde o spolupráci s právem úprav, nikoli převod vlastnictví nebo oprávnění ke všem nastavením osobního účtu.

Serverový `QB_GITHUB_TOKEN` je projektový fine-grained token pro jediný repozitář. Současné požadované oprávnění je Contents: read/write a Actions: read/write. Je uložený v Netlify a nepatří do redaktorova prohlížeče. Příjemce má od vlastníka získat datum jeho expirace a odpovědnost za obnovu; přesná expirace nebyla při tomto předání ověřená.

### Netlify

- Projekt: `qb-radar`.
- Site ID: `1537cc65-8238-4a0b-96b1-5585e6b0e295`.
- Account ID v konfiguraci: `6848803a188f421150b2148f`.
- [Správa projektu](https://app.netlify.com/projects/qb-radar).
- Dosavadní provoz používá Free tarif. Tento protokol není příslibem neomezeného hostingu ani schválením placeného tarifu.

Správce potřebuje oprávnění k existujícímu projektu, jeho nasazením a proměnným prostředí. Nezakládej při chybě přístupu automaticky nový web pod jiným účtem. Nejprve s Milošem ověř zamýšleného vlastníka a přístup.

### OpenRouter

Příjemce musí vědět, kdo spravuje účet, kredit a limit projektového klíče. Schválený **celkový limit klíče je 10 USD**, podle Milošova pokynu z 29. října 2026. Není to údaj o zbývajícím kreditu ani povolení utratit dalších 10 USD. Aktuální čerpání je třeba ověřit u vlastníka účtu; při tvorbě tohoto protokolu nebylo nově zjišťované.

Předání dokumentace nezměnilo vlastníka, fakturaci ani přístupy žádné z těchto služeb.

## 9. Tajné proměnné a přihlášení

### V Netlify, pro produkční prostředí

- `QB_GITHUB_TOKEN`: přístup serveru k jedinému soukromému repozitáři.
- `QB_PASSWORD_HASH`: scrypt otisk redakčního hesla; formát a výpočet určuje funkce `passwordHash` v `server/radar-api.mjs`.
- `QB_SESSION_SECRET`: náhodný klíč pro podepisování relací.
- `AWS_LAMBDA_JS_RUNTIME`: dosavadní nastavení `nodejs22.x`.
- `QB_REPOSITORY` a `QB_BRANCH`: volitelné serverové volby; bez nich kód používá `miloscermak/qb-radar-pilot` a `main`. Nejde o obecnou podporu migrace na jiný repozitář — frontend a další podklady mají také vlastní pevné odkazy.

### V GitHub Actions

- Secret `OPENROUTER_API_KEY` pro AI volání.
- Volitelná repository variable `RADAR_MODEL` pro výběr modelu.
- Standardní oprávnění workflow pro zápis výsledků. Projektový Netlify token se do sběrače nepřidává.

Netlify hash a podpisový klíč přihlášení nejsou OpenRouter klíč. Jejich účely a umístění nezaměňuj. Při kontrole nevypisuj hodnoty proměnných do chatu, logů nebo commitu.

### Relace

Přihlášení používá cookie `__Host-qb_session` s příznaky HttpOnly, Secure, SameSite=Strict a platností sedm dní. Podpis je závislý i na otisku hesla. Změna hesla proto po nasazení zneplatní dosavadní relace. Odhlášení smaže cookie v daném prohlížeči; není to plošné odhlášení všech ostatních zařízení.

Změnu hesla proveď jen na pokyn vlastníka: bezpečně spočítej nový otisk podle stávající funkce, aktualizuj `QB_PASSWORD_HASH`, znovu nasaď aplikaci a ověř nové heslo, odmítnutí starého a zneplatnění staré relace. Hodnoty nedávej do argumentů příkazové řádky ani do zdrojových souborů.

Pomocníci v původní složce `/private/tmp/` byli jednorázové nástroje této pracovní relace. Nejsou součástí předaného repozitáře a nový správce na nich nesmí stavět provoz.

## 10. API a hranice serveru

- `GET /api/session`: ověření stavu přihlášení.
- `POST /api/session`: přihlášení heslem.
- `DELETE /api/session`: odhlášení prohlížeče.
- `GET /api/editorial/decisions`: načtení společných rozhodnutí.
- `PUT /api/editorial/decisions`: změna jednoho ověřeného rozhodnutí s očekávanou verzí.
- Cesty pod `/api/repos/miloscermak/qb-radar-pilot`: povolené čtení souhrnu, reportu, datovaných článků, dávek a výběrů, čtení a úprava `sources.json`, zjištění stavu a ovládání pevného `collect.yml`.

Server kontroluje u zápisů vlastní `Origin` a hlavičku `X-QB-Request: 1`. Soukromé operace vyžadují podepsanou relaci. Repo, větev, soubory a workflow jsou omezené na povolené operace; vstup nesmí vytvořit obecnou GitHub proxy. Odpovědi se neukládají do cache a neobsahují serverový token.

Konfigurace bezpečnostních hlaviček je v `netlify.toml`. CSP povoluje skripty a spojení ze stejného webu. Bez rozmyslu nepřidávej externí skripty, inline JavaScript nebo přímé volání GitHubu z prohlížeče.

## 11. Automatický provoz

Workflow je `.github/workflows/collect.yml`; při kontrole mělo ID `387779759` a stav **active**.

Plán zahrnuje každé tři hodiny v UTC a další ranní spuštění v 04:00 a 05:00 UTC. Python rozhoduje podle `Europe/Prague`, zda už nastal čas dávky. Zpoždění plánovače GitHubu je možné; „v 6:00“ není garantovaný okamžik doručení.

Běh postupně načte aktuální větev, nainstaluje Python závislosti, provede sběr, případnou dávku a AI, obnoví report a commitne výsledky. Souběžné sběry jsou zařazované za sebe. Na závěr se používá pull s rebase a opakovaný pokus o push, protože mezitím mohou zapisovat lidé nebo web.

**Zelený výsledek workflow nepotvrzuje úspěch AI.** AI krok má `continue-on-error`; její problém se projeví ve stavu JSON, souhrnu běhu a upozornění na webu. Kontroluj zvlášť `data/radar/<den>.json`, jeho `status`, `error` a pokrytí článků.

Ruční vstupy jsou `radar_date` ve tvaru YYYY-MM-DD a `radar_force` jako boolean. `radar_force=true` znamená placené opakování AI nad existující dávkou. Nelze jej používat jako běžný test spojení.

Sběr lze pozastavit v aplikaci nebo správou workflow. Pozastavení neznamená smazání dat. Pokud se plánovaný běh delší dobu neobjevuje, zkontroluj stav workflow a historii Actions dřív, než začneš měnit sběrač.

## 12. Vývoj a ověření na novém počítači

Použij Python 3.12 jako v CI a Node.js 22 odpovídající dosavadnímu serverovému prostředí. Potřebuješ Git; pro administraci také vlastní přihlášení GitHub CLI a Netlify CLI. Instalace a přihlášení těchto CLI nejsou přenesené samotným klonem repozitáře.

### Python prostředí

Z kořene aplikace:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
```

Aktivace prostředí je uvedená pro macOS/Linux. Na jiném systému přizpůsob cestu ke spouštěči. `.venv/` je v `.gitignore`. Závislosti jsou v `requirements.txt`; samostatný uzamčený seznam přesných verzí zatím není zavedený.

### JavaScript

```bash
node --check dashboard/app.js
node --check dashboard/sources.js
node --check dashboard/editorial.mjs
node --check server/radar-api.mjs
node --check server/editorial.mjs
node --test tests/sources.test.cjs tests/server.test.mjs tests/editorial.test.mjs
```

Ověřená sada má **9 Python a 31 JavaScript testů**: šest pro správu zdrojů, čtrnáct pro přihlášení a serverové operace a jedenáct pro rozhodování. Testy používají náhradní data a falešné klíče. Produkční přihlašovací údaje nepotřebují a nevolají placený OpenRouter.

CI v `.github/workflows/verify.yml` běží při změnách aplikačních souborů, pull requestech a ručním spuštění. Samotná dokumentační změna na `main` podle současného filtru automatický běh vyvolat nemusí.

### Místní náhled

Repozitář zatím nemá předaný univerzální příkaz typu `npm run dev` pro celý web a server. Prosté statické otevření HTML nezajistí `/api/`, přihlášení ani soukromá data. Netlify Function také není samostatný dlouho běžící HTTP server.

Pro změny chování použij izolovaný místní testovací server s existujícím `createHandler`, náhradním GitHub API a oddělenými rozhodnutími. Sběrač lze přesměrovat proměnnými `QB_DATA` a `QB_SOURCES` na testovací složku a konfiguraci. Parametr `OPENROUTER_BASE_URL` je určený i pro náhradní AI API v testech. Původní dočasný náhled z Milošova počítače není nutné ani možné považovat za dostupnou součást klonu.

Po změně webu ověř skutečný prohlížeč, obnovení stránky, úzkou šířku přibližně 390 px, filtraci, chybové hlášky a zachování volby po načtení. Produkční zkouška zápisu musí po sobě vrátit pouze vlastní testovací změnu. Skutečné volby redakce už v úložišti jsou.

## 13. Git a nasazování

### Git

Před úpravou zkontroluj stav a rozdíly. Po logickém kroku vytvoř stručný anglický commit v imperativu. Nové pracovní větve pojmenovávej `codex/<popis>`, pokud vlastník nezadá jiný postup.

Do `main` mezitím zapisuje sběrač i web. Před pushem stáhni a zachovej jejich změny. Pull s rebase prováděj s čistým nebo vědomě zabezpečeným pracovním stromem. Konflikt generovaných dat neřeš jejich plošným přepsáním starou místní kopií a nepoužívej force push na `main`.

### Netlify

Z kořene aplikace se publikuje:

```bash
bash scripts/deploy-netlify.sh
```

Skript používá existující site ID z `deployment/netlify.json`, publikuje pouze `dashboard/` a balí funkce z `netlify/functions/`. V konfiguraci není sestavování frontendu ani aplikační framework. Příkaz `--no-build` neznamená vynechání serverových funkcí.

Výchozí cesta k CLI je zatím Milošova `/Users/miloscermak/.npm-global/bin/netlify`. Na novém počítači ji přesměruj na vlastní instalaci, například:

```bash
QB_NETLIFY_CLI="$(command -v netlify)" bash scripts/deploy-netlify.sh
```

Předem ověř, že `netlify` existuje a že vlastní účet smí nasazovat do správného projektu. Identitu projektu neměň jen kvůli rozdílné místní cestě.

**Push kódu sám o sobě není dokladem aktualizace Netlify.** Předaný ověřený postup je ruční nasazení skriptem. Po změně serverových proměnných je také potřeba nové nasazení. Změna zdrojů, redakční volba nebo běžný sběr nasazení nepotřebují.

Po nasazení ověř URL, stav funkce, přihlášení, čtení soukromého souhrnu a správnou funkci změny. Nepřihlášené čtení `/api/editorial/decisions` má vrátit 401; soukromé cesty typu `/data/editorial.json`, `/sources.json` a `/server/editorial.mjs` nemají být veřejné statické soubory.

### Pomocníci vázaní na původní prostředí

`scripts/connect-github.mjs` je jednorázový lokální formulář pro vložení projektového tokenu do Netlify. Obsahuje pevný účet, projekt, port 8848 a macOS cestu ke konfiguraci přihlášeného Netlify CLI. Než jej použiješ na jiném stroji nebo pod jiným správcem, ověř tyto předpoklady. Není to další součást produkční aplikace; nemá zůstávat veřejně dostupný.

`scripts/publish-web.sh` slouží jen starému veřejnému přesměrování. Používá `/private/tmp/`, takže také není bez úpravy přenositelný na každý systém. Pro aktualizaci ostrého Radaru ho nepoužívej.

## 14. Obnova po problému

### Web je nedostupný nebo funkce vrací chybu

Zkontroluj poslední publikované nasazení a log funkce v existujícím Netlify projektu. Porovnej dotčený kód a serverové proměnné. Dobrý předchozí deploy je možné využít pro návrat kódu, ale nepovažuj návrat deploye za automatickou obnovu správné konfigurace tajných proměnných. Po návratu přístup vždy ověř.

### Kód je chybný

Vytvoř opravný commit nebo `git revert` konkrétní změny, znovu spusť relevantní testy a nasaď. Nevracej starou celou větev přes aktuální články a redakční rozhodnutí.

### Chybná redakční volba

Použij běžné vrácení v aplikaci. Při souběžné práci respektuj aktuální verzi a HTTP 409. Neobnovuj kvůli jedné volbě celý starý `data/editorial.json`.

### Chybná konfigurace zdroje

Oprav konkrétní zdroj, zachovej jeho ID a neznámá pole. Při obnově z historie porovnej současné změny ostatních zdrojů. Samotné vrácení starého souboru může přepsat práci redakce.

Git obsahuje historii kódu i provozních souborů. Nejde o potvrzený systém nezávislých záloh mimo GitHub. Tajné hodnoty se z Gitu obnovit nemají dát; odpovídá za ně správce účtů.

## 15. Časté potíže a první kontrola

- **Přihlášení vrací 401:** ověř aktuální redakční heslo a obnov stránku. Po změně hesla staré relace správně nefungují. Při 401 až u čtení dat prověř také serverový přístup ke GitHubu; ne každé 401 je překlep redaktora.
- **Zápis vrací 403:** může jít o cizí Origin, chybějící `X-QB-Request`, nepovolenou operaci nebo oprávnění projektového tokenu. Neodstraňuj kvůli tomu plošně kontrolu původu.
- **Server vrací 503 při nastavování přístupu:** ověř přítomnost správných Netlify proměnných a nové nasazení po jejich změně.
- **Zdroje nebo rozhodnutí vrací 409:** stav mezitím změnil kolega. Obnov data a proveď zamýšlenou volbu nad aktuálním stavem. Neopakuj automaticky zastaralý celý dokument.
- **GitHub připojení nefunguje:** ověř platnost a oprávnění projektového tokenu k jedinému repozitáři. Token nevkládej do webového JavaScriptu ani ho neposílej redaktorům.
- **AI hlásí limit klíče nebo HTTP 402:** vlastník ověří limit a kredit OpenRouter. Limit nezvyšuj bez dohody. Po nápravě lze výběr výslovně zopakovat; tím vzniká další placené volání.
- **AI nevrátí platný JSON nebo odpověď skončí limitem:** zkontroluj uloženou chybu, schéma a velikost podkladů. Neodstraňuj validaci jen pro zelený stav.
- **Nový zdroj nemá články:** ověř zapojení, adresu, RSS, filtr a skutečný poslední běh. Některé weby vrací 403, blokují roboty nebo nemají použitelný text.
- **Článek je uložený jen jako titulek:** neprezentuj jej jako ověřený hotový fakt. Stav textu a datum jsou součástí redakční kontroly.
- **Není dnešní výběr, ale sběr je zelený:** zkontroluj existenci dnešní dávky, stav AI JSON a výstup příslušného kroku v Actions. Výběr může mít uloženou chybu, kterou další sběr záměrně neplatí znovu.
- **Po přegenerování se zdánlivě ztratil stav námětu:** porovnej den, fakt a zdrojová ID. Jejich změna znamená nový klíč; dřívější volba není automaticky rozhodnutím o jiném námětu.

## 16. Co je ověřené a k jakému okamžiku

### Kontrola při tvorbě tohoto protokolu

- GitHub potvrzuje soukromý repozitář `miloscermak/qb-radar-pilot` a větev `main`.
- Pracovní kopie byla aktualizovaná na `5e26905` před přidáním tohoto dokumentu. Novější datové commity mohou přibývat bez změny aplikačního kódu.
- Workflow `collect.yml` je active. Poslední dokončený sběr [40872246523](https://github.com/miloscermak/qb-radar-pilot/actions/runs/40872246523) je success. Souhrn z 29. října 13:19 pražského času uvádí jeden nový článek, 14 úspěšných a šest neúspěšných zdrojů v daném běhu.
- Konfigurace obsahuje 20 zdrojů, všech 20 zapojených. Neznamená to 20 vždy dostupných webů.
- Dávka 29. října obsahuje 40 článků, z toho šest s datem přesným jen na den. AI JSON má stav ok a 13 námětů. Vstup uvádí pět článků bez textu. U tří ID model nepotvrdil zpracování; web na neúplnost upozorňuje.
- `data/editorial.json` při kontrole obsahoval pět záznamů: tři Zpracujeme a dva s prázdným stavem. Jsou to časově omezené údaje, nikoli příkaz nastavit tento počet nebo vymazat novější práci.
- Netlify potvrzuje publikovaný deploy **6ae32c26ad446f69c97fe928**, stav ready, publikace 29. října ve 12:21 pražského času. Je to poslední nasazení po změně hesla. Metadata ručního deploye neobsahují Git commit reference, proto vztah mezi deployem a kódem dokládá také pracovní historie a ověření souborů.

### Dřívější provedená ověření této verze

- Implementace společného rozhodování: commit `630ec03`. Cloudová kontrola [40863578858](https://github.com/miloscermak/qb-radar-pilot/actions/runs/40863578858) prošla; kód od té doby nebyl v následujících zde popsaných dokumentačních a datových změnách upravený.
- Prošlo 9 Python a 31 JavaScript testů, včetně souběžného ukládání různých témat, konfliktu stejného námětu, vrácení, neplatných ID, přihlášení a zachování zdrojové konfigurace.
- Ve skutečném prohlížeči byl ověřen výběr, odložení, odmítnutí, návrat předchozího stavu, obnovení stránky a otevření tématu z jiného dne. Ostrá testovací volba byla vrácená; pozdější reálné volby se zachovávají.
- Mobilní šířka 390 px byla bez vodorovného přetékání, konzole bez chyb. Nasazené JS moduly, CSS a návod odpovídaly místním souborům podle SHA-256.
- Po změně hesla proběhlo ostré ověření: nové přihlášení 200, čtení soukromého souhrnu 200, staré heslo 401 a stará relace neplatná.
- Nepřihlášené čtení rozhodnutí vracelo 401. Soukromá data, `sources.json` a serverové moduly nebyly dostupné jako veřejné statické soubory, vracely 404.

Tvorba tohoto protokolu nespouštěla další AI výběr, nový sběr ani změnu produkčních rozhodnutí. Testy z předchozího ověření jsou uvedené s jejich dohledatelným během; nejde o nově provedené testování změněného aplikačního kódu.

## 17. Co zatím není hotové

1. **Databáze QB není připojená.** Novost vůči hráčským profilům, fun factům a publikovaným článkům ověřuje redakce. AI ji nesmí vydávat za potvrzenou.
2. **Není skutečné napojení na Opta ani na katalog 264 zdrojů z mockupu.** Aktuální počet zdrojů a jejich dostupnost určuje skutečná konfigurace a historie sběru.
3. **Není automatická publikace ani napojení Trella.** Redakční volba ukládá stav uvnitř Radaru.
4. **Nejsou osobní účty, role, přiřazený redaktor a poznámky.** Sdílené heslo nerozliší autora konkrétního kliknutí. Git historie serverových zápisů sama totožnost redaktora nedodá.
5. **Není trvalá evidence jedné události napříč dny a zdroji.** Současný námět je svázaný s dnem, faktem a podklady.
6. **AI může něco přehlédnout nebo vyhodnotit chybně.** Technická validace není redakční ověření skutečnosti. Kontroluj původní text, datum a kontext.
7. **Sběr není garantované pokrytí všech zpráv.** Omezuje jej dostupnost webů, kanálů, limity běhu a jednorázové ranní dávky.
8. **Přenositelnost pomocných skriptů je částečná.** Cesta k CLI jde přesměrovat; jednorázové nastavení a Pages pomocník mají další předpoklady původního Macu.
9. **Není samostatný předaný vývojový server ani nezávislé zálohování.** Tyto věci má případná další etapa teprve zavést.
10. **Objem dat a limity služeb je třeba průběžně sledovat.** JSON v Gitu je současné jednoduché úložiště. S růstem plných textů, historie a počtu souběžných redaktorů se má rozhodnout, kdy a proč přejít na jiné ukládání; další databáze se nemá přidávat jen kvůli původnímu mockupu.

## 18. Doporučené další kroky, v pořadí

1. Dokončit skutečné předání přístupů a určit provozního vlastníka, správce kreditu a člověka pro redakční chyby. Ověřit expiraci GitHub tokenu a aktuální čerpání AI.
2. Nechat redakci několik dní vybírat skutečná témata. Od Nikoly získat konkrétní přijaté, odmítnuté a přehlédnuté příklady. Podle nich upravit zadání a doplnit smysluplné regresní příklady.
3. Zavést přenositelný izolovaný vývojový náhled a dokumentovaný postup obnovy nastavení bez vazby na Milošův počítač.
4. Podle skutečné práce redakce rozhodnout o poznámkách, přiřazení člověka a rozdělení oprávnění. Předání do Trella dělat až podle potvrzeného používaného postupu.
5. Pro napojení QB nejprve získat malý export pro čtení: identifikátory hráček, varianty jmen, profily, známé fun facty a články s datem a zdroji. Technologii skutečné databáze QB zatím nemáme potvrzenou. Teprve potom navrhnout synchronizaci a návrhy změn schvalované člověkem.
6. Další zdroje přidávat po menších skupinách a ověřovat skutečný přínos, text, datum, duplicity, čas a cenu. Nenačítat automaticky celý ukázkový katalog.
7. Samostatně řešit dlouhodobá ID událostí a spojování zpráv napříč dny, pokud to začne redakci bránit v práci.

To jsou návrhy další práce, nikoli už schválené integrace, výdaje nebo změny vlastníka.

## 19. Kontrolní seznam skutečného převzetí

Následující body potvrzuje až příjemce a současný vlastník. Nejsou automaticky splněné existencí dokumentu.

- [x] Je určený přebírající GitHub účet `nhauserova` a byly mu odeslané pozvánky k oběma repozitářům.
- [ ] Přijal obě pozvánky, má přístup ke správnému soukromému repozitáři a ví, do které větve smí zapisovat.
- [ ] Má potřebný přístup k existujícímu Netlify projektu.
- [ ] Je jasné, kdo spravuje OpenRouter, limit, kredit a obnovu tokenu GitHubu.
- [ ] Redakční heslo obdržel odděleně a přihlásil se na správnou adresu s pomlčkou.
- [ ] Zkontroloval zapnutý sběr, poslední dávku a zvlášť poslední AI výběr.
- [ ] Rozumí sdíleným volbám, jejich vrácení a ochraně proti přepsání kolegy.
- [ ] Jeho Codex přečetl pravidla a prošel místní testy bez produkčních klíčů.
- [ ] Na jeho počítači funguje přístup k nasazování nebo je dohodnutý jiný člověk, který bude nasazovat.
- [ ] Převzal známé limity a schválil první další konkrétní úkol.

## 20. Úvodní zadání pro Codex přebírajícího uživatele

Následující text lze vložit do nové konverzace Codexu s otevřeným klonem `qb-radar-pilot`:

```text
Přebírám existující QB Radar pro QueenBallers. Jde o fungující aplikaci
na https://qb-radar.netlify.app/, soukromý repozitář je
miloscermak/qb-radar-pilot. Nevytvářej druhou aplikaci.

Nejdřív zkontroluj git status, remote a aktuální větev. Přečti místní
AGENTS.md, PREDANI-CODEX.md, README.md a poslední záznamy WORKLOG.md.
Rozlišuj platné zadání v prompt/ od článků a původního mockupu.

Ověř, jaké přístupy má tento počítač a účet skutečně k dispozici.
Nepředpokládej Milošovy místní cesty, tokeny ani přihlášení. Hodnoty
tajných proměnných nevypisuj do chatu a neukládej do kódu.

Sběr a AI běží na GitHub Actions; web a server na Netlify. Rozhraní je
HTML, CSS a vanilla JS, server Node.js, sběrač Python. Zachovej tuto
jednoduchou architekturu. Redakční rozhodnutí a sources.json jsou
společná produkční data, která mohou kolegové právě měnit.

Proveď nejprve čtení a místní testy bez produkčních klíčů. Zelený sběr
nepovažuj za důkaz úspěšné AI. Zvlášť ověř datum a status posledního
výběru. Obnovování AI ani změnu jejího limitu nespouštěj jen kvůli
diagnostice; schválený celkový limit klíče je 10 USD.

Při převzetí neměň vlastnictví, heslo, zapnutí sběru ani uložené volby.
Nejdřív mi stručně napiš, co je funkční, co se podařilo ověřit, jaký
přístup případně chybí a co je další konkrétní krok. Pro další úpravy
respektuj souběžné zápisy bota a redakce, zapisuj pracovní dokumentaci
a po logických krocích dělej stručné anglické commity. Komunikuj česky.
```

Při dalších změnách průběžný stav patří do `WORKLOG.md`; tento protokol aktualizuj při změně architektury, vlastníka, nasazování nebo způsobu předání.

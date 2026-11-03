# registro-qg-desktop

Registro del Quartier Generale di **Cronache di Unshast**: app desktop (Windows, Linux, macOS) e PWA per iOS/Android.

## Requisiti

| Strumento | Versione | Serve per |
|---|---|---|
| Node.js | 22+ | build, test, dev server |
| Rust (stable) | 1.77+ | solo build desktop Tauri |
| Librerie GTK/WebKit | — | solo build Linux (vedi sotto) |

```bash
# Debian / Ubuntu / Mint
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

## Comandi

```bash
npm install          # installa le dipendenze
npm run dev          # dev server Vite su http://localhost:1420
npm test             # compila dist/ e lancia test unitari + smoke test
npm run test:unit    # solo motore di gioco (veloce, senza build)
npm run test:smoke   # solo smoke test sul bundle (richiede dist/)
npm run test:ui-contract  # verifica che ogni getElementById abbia il suo id
npm run build        # build PWA/web in dist/
npm run tauri:dev    # app desktop in sviluppo
npm run tauri:build  # pacchetti desktop
```

`npm test` si costruisce da solo la cartella `dist/`: non serve più lanciare
`npm run build` a mano prima dei test.

## Test

- **`test/unit/`** — regole di gioco (punti QG, produzione, rischio rotte,
  calendario, livello del QG, modello del registro, chiusura del mese) con
  `node:test`. Il motore riceve `state` e la configurazione come parametri,
  quindi si testa su una campagna inventata senza toccare il DOM.
- **`test/smoke.test.mjs`** — carica il bundle reale in happy-dom, verifica
  avvio, cambio tab, CSS critico e recupero di un registro illeggibile.
- **`test/ui-contract.test.mjs`** — confronta gli id usati dal JS con quelli
  presenti in `index.html` (o creati dai template) ed esige che la
  navigazione sia fatta di `<button>` con `aria-current` e pannelli `tabpanel`.

## Modalità "solo punti QG"

Nella Panoramica c'è l'interruttore **Costruisci senza materiali né oro**:
serve a chi ricrea un Quartier Generale di cui non ha i salvataggi. Finché è
attivo, costruire e potenziare non addebitano materiali né oro e non serve oro
in tesoreria; restano validi i punti QG, i limiti per livello e le altre
regole. Le strutture ottenute così sono marcate *senza costi* e, se
smantellate, non restituiscono materiali: la modalità non è un modo per
generare materiali dal nulla accendendola, costruendo, spegnendola e
smantellando.

## Tema chiaro e scuro

In **Panoramica → Aspetto** si sceglie il tema: *Come il sistema*, *Chiaro
(pergamena)* oppure *Scuro (notte)*. La preferenza è un campo del registro
(`tema`), quindi resta la stessa ad ogni avvio e viaggia con i backup; con
*Come il sistema* l'app segue l'impostazione del dispositivo e si aggiorna
anche a runtime se questa cambia.

Tutti i colori sono variabili CSS in `:root` (`src/styles/app.css`): il tema
scuro è un secondo insieme di valori sotto `:root[data-theme="dark"]`, con
`color-scheme: dark` perché anche i controlli nativi seguano il tema. Le tinte
usate come *testo* hanno varianti dedicate (`--red-text`, `--green-text`, …)
separate da quelle che fanno da sfondo ai tag. `src/ui/theme.js` si limita a
scrivere `data-theme` su `<html>`; uno script inline in `index.html` lo imposta
prima del primo paint, così non c'è il lampo chiaro all'avvio.

## Ricerca globale (`Ctrl+K`)

`Ctrl+K` (⌘K su Mac) apre una palette che cerca in tutto il registro: catalogo
strutture, strutture possedute, magazzino, membri, movimenti e rotte. Invio o
click portano nella tab della voce scelta. L'indice è in
`src/engine/ricerca.js` (modulo puro, accenti e maiuscole ignorati) e viene
ricostruito ad ogni apertura; la UI è in `src/ui/palette.js`.

## Sala da Guerra e potenziamenti navali

La scheda "Guerra" del regolamento non è stata fornita e il catalogo dei
potenziamenti navali vive su una pagina esterna: l'app non inventa né regole di
battaglia né prezzi. La **Sala da Guerra** tiene il piano (stato, obiettivi come
checklist, forze disponibili lette dal Campo d'Addestramento, diario datato col
mese di campagna) e `src/engine/guerra.js` si limita a contare le unità e
riassumere gli obiettivi. Porto Militare ed Eliporto Arcano registrano gli
acquisti effettivi con lo sconto applicato in un catalogo personale
(`state.potenziamentiNavali`), che resta consultabile mese dopo mese.

## Pipeline (`.github/workflows/ci.yml`)

Un solo workflow:

| Job | Quando | Cosa fa |
|---|---|---|
| `quality` | ogni push e pull request | `npm ci`, `npm test`, contratto UI |
| `pages` | push su `main` | build con `DEPLOY_PWA=true` + pubblicazione su GitHub Pages |
| `desktop` | tag `v*` o dispatch manuale | build Tauri a matrice (Windows/Linux/macOS) |
| `release` | tag `v*` | GitHub Release con gli installer |

I pacchetti desktop **non** vengono più compilati ad ogni push: costavano
minuti di runner per artefatti che nessuno scaricava.

## Struttura

```
src/
  app.js            avvio, navigazione, scorciatoie, gesti
  core/             stato, persistenza, configurazione, backup, validazione
    defaultState.js stato iniziale unico + versione di schema + sanificazione
  engine/           regole di gioco (produzione, rischio, token, chiusura mese,
                    ricerca globale, forze della Sala da Guerra)
  modules/          sotto-meccaniche per struttura (biblioteca, avamposto, ...)
  ui/               rendering delle tab, tema, palette di ricerca
    structures/     catalogo, sotto-meccaniche, satelliti, eventi
  data/regolamento.json   configurazione di gioco (importata a build time)
src-tauri/          shell desktop (Rust, Tauri 2)
test/               unit, smoke, contratto UI
```

## Dati e backup

Il registro vive in `localStorage` nella PWA e in un file nella cartella dati
dell'app su desktop. Si esporta/importa dalla sidebar (**Esporta backup** /
**Importa backup**); l'import accetta solo le chiavi note del registro e
riparte dai valori di default per quelle mancanti.

Se il registro salvato è illeggibile, l'app lo mette in quarantena, sospende i
salvataggi e permette di scaricarlo prima di ripartire: il file originale non
viene mai sovrascritto.

## Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Il tag compila i pacchetti desktop, crea la release e (insieme al push su
`main`) aggiorna la PWA su GitHub Pages.

## Skill di progetto

Le agent skill usate per lavorare sul repo stanno in `.agents/skills/`
(symlink in `.claude/skills/`, lock in `skills-lock.json`). Per ripristinarle:
`npx skills experimental_install`.

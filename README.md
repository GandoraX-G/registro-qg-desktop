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
  engine/           regole di gioco (produzione, rischio, token, chiusura mese)
  modules/          sotto-meccaniche per struttura (biblioteca, avamposto, ...)
  ui/               rendering delle tab
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

# registro-qg-desktop
App Desktop e Web per gestione QG Unshast (Windows, Linux, macOS, iOS/Android via PWA)

## Requisiti per build locale

### Tutte le piattaforme
- Node.js 22+
- Rust (stable)

### Linux (Debian/Ubuntu/Mint)
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

## Build

```bash
npm install
npm run tauri build
```

## Output build

| Piattaforma | Formato | Installazione |
|-------------|---------|---------------|
| Windows | NSIS Installer | Eseguire il `.exe` |
| Linux | Debian Package | `sudo dpkg -i *.deb` |
| Linux | AppImage | Rendere eseguibile e lanciare |
| macOS | DMG | Aprire il `.dmg` e trascinare in Applicazioni |
| iOS / Android | PWA | Aprire il link e "Aggiungi alla schermata Home" |

## PWA (iOS e Android)

La webapp e disponibile come PWA su GitHub Pages, installabile su qualsiasi smartphone senza app store.

### Installa su iPhone/iPad
1. Apri Safari e vai al link della PWA
2. Tocca il pulsante **Condividi** (quadrato con freccia)
3. Tocca **"Aggiungi alla schermata Home"**
4. Conferma con "Aggiungi"

### Installa su Android
1. Apri Chrome e vai al link della PWA
2. Tocca il menu (tre puntini)
3. Tocca **"Installa app"** o **"Aggiungi alla schermata Home"**
4. Conferma

La PWA funziona offline grazie al service worker.

## Release

Per pubblicare una release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

La GitHub Action creera automaticamente:
- Una release con tutti i file desktop (Windows, Linux, macOS)
- La PWA su GitHub Pages (per iOS e Android)

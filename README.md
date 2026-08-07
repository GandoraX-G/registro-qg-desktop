# registro-qg-desktop
App Desktop e Mobile per gestione QG Unshast (Windows, Linux, macOS, Android)

## Requisiti per build locale

### Tutte le piattaforme
- Node.js 22+
- Rust (stable)

### Linux (Debian/Ubuntu/Mint)
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

### Android
- Android Studio
- Android SDK 34+
- NDK 27+

## Build

```bash
npm install
npm run tauri build
```

### Build Android
```bash
npx tauri android init
npx tauri android build
```

## Output build

| Piattaforma | Formato | Installazione |
|-------------|---------|---------------|
| Windows | NSIS Installer | Eseguire il `.exe` |
| Linux | Debian Package | `sudo dpkg -i *.deb` |
| Linux | AppImage | Rendere eseguibile e lanciare |
| macOS | DMG | Aprire il `.dmg` e trascinare in Applicazioni |
| Android | APK | Abilitare "Sorgenti sconosciute" e installare |

## Release

Per pubblicare una release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

La GitHub Action creera automaticamente una release con tutti i file per le 5 piattaforme.

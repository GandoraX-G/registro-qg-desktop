# registro-qg-desktop
App Desktop per gestione QG Unshast (Windows e Linux)

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

| Piattaforma | Formato | Output |
|-------------|---------|--------|
| Windows | NSIS Installer | `src-tauri/target/release/bundle/nsis/*.exe` |
| Linux | Debian Package | `src-tauri/target/release/bundle/deb/*.deb` |
| Linux | AppImage | `src-tauri/target/release/bundle/appimage/*.AppImage` |

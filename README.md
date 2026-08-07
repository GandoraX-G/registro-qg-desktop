# registro-qg-desktop
App Desktop e Mobile per gestione QG Unshast (Windows, Linux, macOS, iOS, Android)

## Requisiti per build locale

### Tutte le piattaforme
- Node.js 22+
- Rust (stable)

### Linux (Debian/Ubuntu/Mint)
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf
```

### iOS (solo macOS)
- Xcode 15+
- Apple Developer Account (per distribuzione)

### Android
- Android Studio
- Android SDK 34+
- NDK 27+

## Build

```bash
npm install
npm run tauri build
```

### Build Mobile
```bash
# iOS (solo macOS)
npx tauri ios init
npx tauri ios build

# Android
npx tauri android init
npx tauri android build
```

## Output build

| Piattaforma | Formato | Output |
|-------------|---------|--------|
| Windows | NSIS Installer | `src-tauri/target/release/bundle/nsis/*.exe` |
| Linux | Debian Package | `src-tauri/target/release/bundle/deb/*.deb` |
| Linux | AppImage | `src-tauri/target/release/bundle/appimage/*.AppImage` |
| macOS | DMG | `src-tauri/target/release/bundle/dmg/*.dmg` |
| iOS | IPA | `src-tauri/gen/apple/build/Release-iphoneos/*.ipa` |
| Android | APK | `src-tauri/gen/android/app/build/outputs/apk/**/*.apk` |

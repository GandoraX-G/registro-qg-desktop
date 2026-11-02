import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.DEPLOY_PWA ? '/registro-qg-desktop/' : '/';

/* manifest.json e le icone sono copiati da vite-plugin-static-copy e devono
   restare a percorso fisso: Vite, di suo, tratta gli href dell'HTML come
   asset e li rinominerebbe in /assets/*, rompendo i percorsi interni del
   manifest. Qui vengono riscritti dopo la trasformazione, con la base giusta. */
function pwaLinks() {
  // Prefisso senza slash finale: "" in dev/Tauri, "/registro-qg-desktop" su Pages.
  const swBase = base.replace(/\/+$/, '');
  return {
    name: 'pwa-links',
    transformIndexHtml: {
      order: 'post',
      handler: html => html
        .replace(/href="[^"]*manifest[^"]*\.json"/, `href="${base}manifest.json"`)
        .replace(/href="[^"]*icon_128x128[^"]*"/, `href="${base}icons/icon_128x128.png"`)
        .replace(/href="[^"]*icon_32x32[^"]*"/, `href="${base}icons/icon_32x32.png"`)
        .replace(/const swBase = [^;]*;/, `const swBase = ${JSON.stringify(swBase)};`)
        // In dev il service worker resta spento, per non servire moduli stantii.
        .replace("if ('serviceWorker' in navigator) {",
                 "if ('serviceWorker' in navigator && !document.querySelector('script[src*=\"@vite/client\"]')) {")
    }
  };
}

export default defineConfig({
  root: 'src',
  base,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
  plugins: [
    pwaLinks(),
    viteStaticCopy({
      targets: [
        { src: 'data/regolamento.json', dest: 'data' },
        { src: 'manifest.json', dest: '.' },
        { src: 'sw.js', dest: '.' },
        { src: 'icons/*', dest: 'icons' }
      ]
    })
  ],
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});

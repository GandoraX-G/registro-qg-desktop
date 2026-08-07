import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src',
  base: process.env.DEPLOY_PWA ? '/registro-qg-desktop/' : '/',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
  plugins: [
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

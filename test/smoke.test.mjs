/* Smoke test dell'app reale: carica dist/index.html e il bundle Vite in
   happy-dom, poi verifica init, cambio tab e il recupero di un registro
   illeggibile. Nasce dall'harness che ha individuato il bug dei click
   (isTouch fuori scope), così quella regressione non può rientrare. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const TAB = ['panoramica', 'strutture', 'magazzino', 'rotte', 'finanze', 'preventivo'];

let istanze = 0;

function entryBundle() {
  const assets = path.join(DIST, 'assets');
  const file = fs.readdirSync(assets).find(f => /^index-.*\.js$/.test(f));
  assert.ok(file, 'bundle Vite non trovato in dist/assets');
  return path.join(assets, file);
}

function installaGlobals(win) {
  const doc = win.document;
  const globals = {
    window: win, document: doc, localStorage: win.localStorage,
    location: win.location, history: win.history, navigator: win.navigator,
    HTMLElement: win.HTMLElement, CSS: win.CSS, Element: win.Element, Node: win.Node,
    Event: win.Event, MouseEvent: win.MouseEvent, KeyboardEvent: win.KeyboardEvent,
    CustomEvent: win.CustomEvent, DOMRect: win.DOMRect, Image: win.Image,
    HTMLInputElement: win.HTMLInputElement, HTMLSelectElement: win.HTMLSelectElement,
    HTMLButtonElement: win.HTMLButtonElement, MutationObserver: win.MutationObserver,
    screen: win.screen, devicePixelRatio: win.devicePixelRatio,
    getComputedStyle: win.getComputedStyle.bind(win),
    requestAnimationFrame: cb => setTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: id => clearTimeout(id),
    ResizeObserver: win.ResizeObserver || class { observe(){} unobserve(){} disconnect(){} },
    IntersectionObserver: win.IntersectionObserver || class { observe(){} unobserve(){} disconnect(){} },
    matchMedia: win.matchMedia || Object.assign(() => ({
      matches: false, media: '', addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){}
    }), {}),
  };
  for (const [k, v] of Object.entries(globals)) {
    try { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } catch {}
  }
  globalThis.fetch = async input => {
    const url = new URL(typeof input === 'string' ? input : input.url, 'http://localhost:3000/');
    const file = path.join(DIST, decodeURIComponent(url.pathname));
    if (!fs.existsSync(file)) return new Response('non trovato', { status: 404 });
    return new Response(fs.readFileSync(file), { status: 200 });
  };
  win.fetch = globalThis.fetch;
}

async function avvia({ width, height, seed }) {
  assert.ok(fs.existsSync(path.join(DIST, 'index.html')), 'manca dist/: esegui `npm run build` prima di `npm test`');

  const win = new Window({
    url: 'http://localhost:3000/', width, height,
    settings: {
      disableJavaScriptEvaluation: true, disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true, handleDisabledFileLoadingAsSuccess: true,
    },
  });
  win.document.write(fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'));
  if (seed) for (const [k, v] of Object.entries(seed)) win.localStorage.setItem(k, v);

  installaGlobals(win);

  const errori = [];
  try {
    await import('file://' + entryBundle() + '?istanza=' + (++istanze));
  } catch (e) {
    errori.push(e.message);
  }
  await new Promise(r => setTimeout(r, 250));
  return { win, doc: win.document, errori };
}

for (const caso of [
  { nome: 'desktop 1280x900', width: 1280, height: 900 },
  { nome: 'mobile 390x844', width: 390, height: 844 },
]) {
  test(`init e cambio tab — ${caso.nome}`, async () => {
    const { doc, errori } = await avvia(caso);
    assert.deepEqual(errori, [], 'il bundle ha lanciato durante il boot');

    assert.equal(doc.getElementById('loading').style.display, 'none', 'la schermata di caricamento resta visibile');
    assert.equal(doc.getElementById('app').style.display, 'grid', "l'app non è stata mostrata");

    const nav = doc.querySelectorAll('.nav-item[data-tab]');
    assert.ok(nav.length >= 6, `voci di navigazione trovate: ${nav.length}`);

    for (const tab of TAB) {
      assert.ok(doc.getElementById('tab-' + tab), `manca il pannello #tab-${tab}`);
    }

    for (const target of ['finanze', 'strutture']) {
      const voce = doc.querySelector(`.nav-item[data-tab="${target}"]`);
      assert.ok(voce, `manca la voce di navigazione ${target}`);
      voce.click();
      await new Promise(r => setTimeout(r, 50));

      assert.notEqual(doc.getElementById('tab-' + target).style.display, 'none', `il click su ${target} non ha cambiato pannello`);
      const altre = TAB.filter(t => t !== target && doc.getElementById('tab-' + t).style.display !== 'none');
      assert.deepEqual(altre, [], `pannelli rimasti visibili dopo il click su ${target}: ${altre.join(', ')}`);
    }
  });
}

test('registro illeggibile: in quarantena e mai sovrascritto', async () => {
  const rotto = '{"nome":"QG di prova","rotte":[';
  const { win, doc, errori } = await avvia({ width: 1280, height: 900, seed: { qg_registro_v1: rotto } });
  assert.deepEqual(errori, [], 'il bundle ha lanciato con un registro corrotto');

  assert.ok(doc.getElementById('datiDanneggiati'), 'manca il riquadro di recupero');

  const chiaviQuarantena = [];
  for (let i = 0; i < win.localStorage.length; i++) {
    const k = win.localStorage.key(i);
    if (k.startsWith('qg_registro_v1.danneggiato.')) chiaviQuarantena.push(k);
  }
  assert.equal(chiaviQuarantena.length, 1, 'il registro danneggiato non è stato messo in quarantena');
  assert.equal(win.localStorage.getItem(chiaviQuarantena[0]), rotto, 'la copia in quarantena non corrisponde all\'originale');

  // Un click qualunque genera saveState(): non deve toccare il registro rotto.
  doc.querySelector('.nav-item[data-tab="finanze"]').click();
  await new Promise(r => setTimeout(r, 400));
  assert.equal(win.localStorage.getItem('qg_registro_v1'), rotto, 'il registro danneggiato è stato sovrascritto');
});

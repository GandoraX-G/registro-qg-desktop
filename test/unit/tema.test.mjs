/* Tema chiaro/scuro. Si verifica la regola (preferenza + sistema) e che il
   cablaggio esista davvero: senza il blocco CSS o senza il menu in Panoramica
   il tema "scuro" sarebbe solo un valore salvato che non cambia nulla. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TEMI, temaEffettivo } from '../../src/ui/theme.js';
import { createDefaultState, CHIAVI_STATO } from '../../src/core/defaultState.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = relativo => fs.readFileSync(path.join(ROOT, relativo), 'utf8');

test('la preferenza esplicita vince sul sistema', () => {
  assert.equal(temaEffettivo('chiaro', true), 'chiaro');
  assert.equal(temaEffettivo('chiaro', false), 'chiaro');
  assert.equal(temaEffettivo('scuro', false), 'scuro');
  assert.equal(temaEffettivo('scuro', true), 'scuro');
});

test('"auto" segue il sistema e qualunque valore ignoto ricade su auto', () => {
  assert.equal(temaEffettivo('auto', true), 'scuro');
  assert.equal(temaEffettivo('auto', false), 'chiaro');
  assert.equal(temaEffettivo(undefined, true), 'scuro');
  assert.equal(temaEffettivo('blu', false), 'chiaro');
  assert.equal(temaEffettivo(null, true), 'scuro');
});

test('il tema fa parte del registro salvato, con "auto" come default', () => {
  const iniziale = createDefaultState();
  assert.equal(iniziale.tema, 'auto');
  assert.ok(CHIAVI_STATO.includes('tema'), 'senza la chiave in CHIAVI_STATO il tema non verrebbe salvato');
  assert.deepEqual(TEMI, ['auto', 'chiaro', 'scuro']);
});

test('il foglio di stile ha davvero un tema scuro, non solo una data-theme', () => {
  const css = leggi('src/styles/app.css');
  assert.match(css, /\[data-theme="dark"\]/, 'manca il blocco [data-theme="dark"]');
  const blocco = css.slice(css.indexOf('[data-theme="dark"]'));
  assert.match(blocco, /--parchment:/, 'il tema scuro non ridefinisce la superficie principale');
  assert.match(blocco, /--ink:/, 'il tema scuro non ridefinisce il colore del testo');
  assert.match(blocco, /color-scheme:\s*dark/, 'senza color-scheme i controlli nativi restano chiari');
});

test('in Panoramica c\'è il menu del tema con le tre scelte', () => {
  const html = leggi('src/index.html');
  assert.match(html, /<select[^>]*id="dash-in-tema"/, 'manca il menu del tema');
  for (const valore of ['auto', 'chiaro', 'scuro']) {
    assert.match(html, new RegExp(`<option value="${valore}"`), `manca l'opzione ${valore}`);
  }
});

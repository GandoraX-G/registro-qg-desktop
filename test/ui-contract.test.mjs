/* Contratto tra JS e HTML.

   Ogni getElementById('x') del codice deve puntare a un id che esiste, o in
   index.html o in un template generato dal JS (alcuni pannelli vengono creati
   a runtime). Il test è nato da quattro riferimenti morti trovati a mano:
   avampostoTipoSelect, avampostoCostoNota, impresaTipoSelect e wh-capacity. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

function fileJs(dir) {
  const risultati = [];
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    const percorso = path.join(dir, voce.name);
    if (voce.isDirectory()) risultati.push(...fileJs(percorso));
    else if (voce.name.endsWith('.js')) risultati.push(percorso);
  }
  return risultati;
}

const sorgenti = fileJs(SRC);
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

const idInHtml = new Set([...html.matchAll(/\bid="([^"{}]+)"/g)].map(m => m[1]));
// Gli id possono nascere anche da `id="..."` in un template o da un
// assegnamento `elemento.id = "..."` fatto a runtime.
const idInTemplate = new Set(
  sorgenti.flatMap(file => [
    ...fs.readFileSync(file, 'utf8').matchAll(/\bid="([^"${}]+)"|\.id\s*=\s*["']([^"']+)["']/g),
  ].map(m => m[1] ?? m[2])),
);

test('ogni id cercato dal JS esiste davvero', () => {
  const mancanti = new Set();
  for (const file of sorgenti) {
    const codice = fs.readFileSync(file, 'utf8');
    for (const match of codice.matchAll(/getElementById\(\s*["']([\w-]+)["']\s*\)/g)) {
      const id = match[1];
      if (!idInHtml.has(id) && !idInTemplate.has(id)) {
        mancanti.add(`${id} (${path.relative(SRC, file)})`);
      }
    }
  }
  assert.deepEqual([...mancanti], [], `id del DOM inesistenti:\n${[...mancanti].join('\n')}`);
});

test('la navigazione è fatta di bottoni e i pannelli sono tabpanel', () => {
  const nav = [...html.matchAll(/<button[^>]*class="nav-item[^"]*"[^>]*data-tab="([\w-]+)"/g)].map(m => m[1]);
  assert.deepEqual(nav, ['panoramica', 'strutture', 'magazzino', 'rotte', 'finanze', 'preventivo']);

  for (const tab of nav) {
    assert.match(html, new RegExp(`id="nav-${tab}"`), `manca l'id del bottone ${tab}`);
    assert.match(html, new RegExp(`<section id="tab-${tab}"[^>]*role="tabpanel"`), `il pannello ${tab} non è un tabpanel`);
  }
});

test('le aree che cambiano da sole sono annunciate (aria-live)', () => {
  assert.match(html, /id="toast"[^>]*aria-live="polite"/);
  assert.match(html, /id="saveIndicator"[^>]*aria-live="polite"/);
});

test('ogni etichetta è collegata al suo controllo', () => {
  const senza = [];
  for (const m of html.matchAll(/<label([^>]*)>/g)) {
    const attrs = m[1];
    if (/\bfor="[^"]+"/.test(attrs)) continue;
    // Una label che avvolge il controllo va bene anche senza for.
    const corpo = html.slice(m.index, html.indexOf('</label>', m.index));
    if (/<(input|select|textarea)\b/.test(corpo)) continue;
    senza.push(html.slice(m.index, m.index + 90).replace(/\s+/g, ' '));
  }
  assert.deepEqual(senza, [], `label senza for e senza controllo avvolto:\n${senza.join('\n')}`);
});

test('le intestazioni di tabella dichiarano lo scope', () => {
  const senzaScope = [...html.matchAll(/<th\s[^>]*>/g)]
    .map(m => m[0])
    .filter(tag => !/\bscope=/.test(tag));
  assert.deepEqual(senzaScope, [], `th senza scope:\n${senzaScope.join('\n')}`);
});

test('la ricerca globale è un dialogo accessibile con la sua scorciatoia', () => {
  assert.match(html, /id="searchModalBg"[^>]*role="dialog"/);
  assert.match(html, /id="searchModalBg"[^>]*aria-modal="true"/);
  assert.match(html, /id="search-input"[^>]*role="combobox"/);
  assert.match(html, /id="search-results"[^>]*role="listbox"/);
  const app = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
  assert.match(app, /apriPalette\(\)/, 'Ctrl+K non apre più la palette');
});

test('la guida è un dialogo accessibile', () => {
  assert.match(html, /id="guideModalBg"[^>]*role="dialog"/);
  assert.match(html, /id="guideModalBg"[^>]*aria-modal="true"/);
  assert.match(html, /id="guideModalBg"[^>]*aria-labelledby="guideTitle"/);
  assert.match(html, /id="guideTitle"/);
});

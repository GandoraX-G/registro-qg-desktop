/* Ricerca globale: normalizzazione, indicizzazione e ordinamento dei
   risultati. Il modulo è puro, quindi si verifica su un registro finto. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizza, costruisciIndice, cerca } from '../../src/engine/ricerca.js';

const catalogo = [
  { id: 'miniera', nome: 'Miniera', categoria: 'Produzione', costo: 60, desc: 'Estrae materiali grezzi' },
  { id: 'porto_militare', nome: 'Porto Militare', categoria: 'Militare', costo: 80, desc: 'Sconto sui potenziamenti navali' },
  { id: 'sala_da_guerra', nome: 'Sala da Guerra', categoria: 'Militare', costo: 500, desc: 'Pianificazione' },
];

const dati = {
  catalogo,
  strutture: [{ catId: 'miniera', livello: 2 }],
  materiali: { Ferro: 40, 'Beni vegetali': 120 },
  prezzi: { Ferro: 12 },
  membri: [{ nome: 'Elàrion', livello: 7 }],
  movimenti: [{ data: '03/11', label: 'Vendita ferro', importo: 120 }],
  rotte: [{ nome: 'Porta Ethea', distanza: 320 }],
};

test('normalizza toglie accenti, maiuscole e spazi doppi', () => {
  assert.equal(normalizza('  Sala  da Guèrra '), 'sala da guerra');
  assert.equal(normalizza(null), '');
  assert.equal(normalizza(undefined), '');
});

test('l\'indice copre catalogo, possedute, magazzino, membri, movimenti e rotte', () => {
  const indice = costruisciIndice(dati);
  const tipi = new Set(indice.map(v => v.tipo));
  assert.deepEqual([...tipi].sort(), ['Materiale', 'Membro', 'Movimento', 'Posseduta', 'Rotta', 'Struttura']);
  assert.ok(indice.some(v => v.titolo === 'Miniera (Lv.2)'), 'manca la struttura posseduta con il livello');
});

test('ogni voce sa in quale tab portare l\'utente', () => {
  for (const v of costruisciIndice(dati)) {
    assert.ok(['panoramica', 'strutture', 'magazzino', 'rotte', 'finanze', 'preventivo'].includes(v.tab), `tab sconosciuta: ${v.tab}`);
  }
});

test('la ricerca trova per titolo, per descrizione e senza accenti', () => {
  const indice = costruisciIndice(dati);
  assert.equal(cerca(indice, 'miniera')[0].titolo, 'Miniera');
  assert.equal(cerca(indice, 'naval')[0].titolo, 'Porto Militare', 'la descrizione non è indicizzata');
  assert.equal(cerca(indice, 'elarion')[0].titolo, 'Elàrion', 'la ricerca deve ignorare gli accenti');
  assert.equal(cerca(indice, 'guerra').length > 0, true);
});

test('chi ha il titolo corrispondente viene prima del resto', () => {
  const indice = costruisciIndice(dati);
  const risultati = cerca(indice, 'porto');
  assert.equal(risultati[0].titolo, 'Porto Militare');
});

test('termine vuoto non propone nulla, e c\'è un tetto ai risultati', () => {
  const indice = costruisciIndice(dati);
  assert.deepEqual(cerca(indice, '   '), []);
  const molti = costruisciIndice({ materiali: Object.fromEntries([...Array(30)].map((_, i) => [`Materiale ${i}`, i])) });
  assert.equal(cerca(molti, 'materiale', 5).length, 5);
});

test('un registro vuoto non rompe l\'indice', () => {
  assert.deepEqual(costruisciIndice(), []);
  assert.deepEqual(cerca(costruisciIndice(), 'ferro'), []);
});

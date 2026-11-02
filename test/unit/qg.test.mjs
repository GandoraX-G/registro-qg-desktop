/* Regole dei Punti QG, del personale e del valore del magazzino.
   Il motore riceve stato e catalogo come parametri, quindi qui non serve
   nessun DOM e nessun registro reale: si testano direttamente le regole. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  puntiCosto,
  puntiSpesiTotali,
  personaleRichiesto,
  valoreMagazzino,
  contaStruttureCategoria,
  hasStrutturaSpecializzata,
} from '../../src/engine/qg.js';

const CATALOGO = [
  { id: 'biblioteca', categoria: 'Generali', personale: 1, exempt: false },
  { id: 'campo_coltivato', categoria: 'Produzione', personale: 2, exempt: false },
  { id: 'magazzino_str', categoria: 'Produzione', personale: 1, exempt: false },
  { id: 'porto_militare', categoria: 'Militare', personale: 3, exempt: false },
  { id: 'impresa', categoria: 'Vendita', personale: 1, exempt: true },
];

const struttura = (catId, livello = 1) => ({ uid: catId, catId, livello });
const stato = (strutture, extra = {}) => ({
  classe: 'Produzione',
  strutture,
  materiali: {},
  ...extra,
});

test('punti: generali 2, classe propria 2, altra classe 4, esenti 0', () => {
  const trova = id => CATALOGO.find(c => c.id === id);
  assert.equal(puntiCosto(trova('biblioteca'), 'Produzione'), 2);
  assert.equal(puntiCosto(trova('campo_coltivato'), 'Produzione'), 2);
  assert.equal(puntiCosto(trova('porto_militare'), 'Produzione'), 4);
  assert.equal(puntiCosto(trova('impresa'), 'Produzione'), 0);
  // Senza classe assegnata, tutto ciò che non è Generale costa 4.
  assert.equal(puntiCosto(trova('campo_coltivato'), 'Nessuna'), 4);
});

test('punti spesi: somma per livello, esclusi gli esenti', () => {
  const s = stato([
    struttura('biblioteca', 1),      // 2
    struttura('campo_coltivato', 3), // 2 * 3
    struttura('impresa', 1),         // 0
  ]);
  assert.equal(puntiSpesiTotali(s, CATALOGO), 8);
});

test('punti spesi: le strutture non in catalogo vengono ignorate', () => {
  const s = stato([struttura('sconosciuta', 2), struttura('biblioteca', 1)]);
  assert.equal(puntiSpesiTotali(s, CATALOGO), 2);
});

test('personale richiesto somma il personale del catalogo', () => {
  const s = stato([struttura('campo_coltivato', 1), struttura('porto_militare', 2)]);
  assert.equal(personaleRichiesto(s, CATALOGO), 5);
});

test('valore magazzino usa il listino, 0 per materiali sconosciuti', () => {
  const s = stato([], { materiali: { Legna: 10, Ferro: 2, Mistero: 5 } });
  assert.equal(valoreMagazzino(s, { Legna: 1.5, Ferro: 10 }), 15 + 20);
});

test('conta strutture per categoria e rileva le specializzate', () => {
  const s = stato([struttura('campo_coltivato'), struttura('magazzino_str'), struttura('biblioteca')]);
  assert.equal(contaStruttureCategoria('Produzione', s, CATALOGO), 2);
  assert.equal(contaStruttureCategoria('Generali', s, CATALOGO), 1);
  assert.equal(hasStrutturaSpecializzata(s, CATALOGO), true);
  assert.equal(hasStrutturaSpecializzata(stato([struttura('biblioteca')]), CATALOGO), false);
});

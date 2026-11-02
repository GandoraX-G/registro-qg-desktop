/* Costi di costruzione con e senza la modalità "solo punti QG". */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soloPuntiQG, valutaCosti, materialiRestituiti } from '../../src/engine/costruzione.js';

const MATERIALI = [{ m: 'Legna', u: 10 }, { m: 'Pietra', u: 5 }];

test('modalità spenta: addebita oro e materiali e segnala cosa manca', () => {
  const s = { modalitaSoloPuntiQG: false };
  const costi = valutaCosti({
    costoOro: 100,
    oroDisponibile: 40,
    materiali: MATERIALI,
    giacenze: { Legna: 2 },
  }, s);

  assert.equal(costi.costoSospeso, false);
  assert.equal(costi.oroDaPagare, 100);
  assert.deepEqual(costi.materialiDaScalare, MATERIALI);
  assert.deepEqual(costi.errori.map(e => e.tipo), ['oro', 'materiali']);
  assert.deepEqual(costi.errori[0], { tipo: 'oro', richiesti: 100, disponibili: 40 });
  assert.deepEqual(costi.errori[1].mancanti, [
    { materiale: 'Legna', richiesti: 10, disponibili: 2 },
    { materiale: 'Pietra', richiesti: 5, disponibili: 0 },
  ]);
});

test('modalità accesa: niente oro, niente materiali, nessun errore', () => {
  const s = { modalitaSoloPuntiQG: true };
  const costi = valutaCosti({
    costoOro: 100,
    oroDisponibile: 0,
    materiali: MATERIALI,
    giacenze: {},
  }, s);

  assert.deepEqual(costi.errori, []);
  assert.equal(costi.oroDaPagare, 0);
  assert.deepEqual(costi.materialiDaScalare, []);
  assert.equal(costi.costoSospeso, true);
});

test('solo il booleano true attiva la modalità', () => {
  assert.equal(soloPuntiQG({ modalitaSoloPuntiQG: true }), true);
  assert.equal(soloPuntiQG({ modalitaSoloPuntiQG: false }), false);
  assert.equal(soloPuntiQG({ modalitaSoloPuntiQG: 'true' }), false);
  assert.equal(soloPuntiQG({ modalitaSoloPuntiQG: 1 }), false);
  assert.equal(soloPuntiQG({}), false);
});

test('smantellare non restituisce materiali mai pagati', () => {
  assert.deepEqual(materialiRestituiti({ costoSospeso: true }, MATERIALI), []);
  assert.deepEqual(materialiRestituiti({}, MATERIALI), MATERIALI);
  assert.deepEqual(materialiRestituiti(null, MATERIALI), []);
});

test('senza stato esplicito usa il registro reale (modalità spenta di default)', () => {
  assert.equal(soloPuntiQG(), false);
});

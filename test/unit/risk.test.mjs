/* Rischio delle rotte commerciali: 5% base + 5% per 100 km scoperti,
   con tiri resi deterministici iniettando rng. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcRischio, tiraRischioRotte } from '../../src/engine/risk.js';

test('rischio: 0 senza km scoperti', () => {
  assert.equal(calcRischio(0, 0), 0);
  assert.equal(calcRischio(400, 400), 0);
  assert.equal(calcRischio(100, 500), 0);
});

test('rischio: 5% base + 5% per ogni 100 km scoperti', () => {
  assert.equal(calcRischio(1, 0), 10);      // 1 blocco
  assert.equal(calcRischio(100, 0), 10);    // 1 blocco
  assert.equal(calcRischio(101, 0), 15);    // 2 blocchi
  assert.equal(calcRischio(400, 0), 25);    // 4 blocchi
  assert.equal(calcRischio(400, 300), 10);  // 100 km scoperti
});

test('rischio: mai oltre il 100%', () => {
  assert.equal(calcRischio(5000, 0), 100);
});

test('rischio: input non numerici non producono NaN', () => {
  assert.equal(calcRischio(undefined, undefined), 0);
  assert.equal(calcRischio('200', '0'), 15);
});

test('tiro: attacco riuscito dimezza il carico (arrotondato per eccesso)', () => {
  const s = {
    strutture: [],
    materiali: { Legna: 10 },
    rotte: [{ nome: 'Rotta Est', distanza: 100, avampostoUid: null, carico: { materiale: 'Legna', quantita: 10 } }],
  };
  const [esito] = tiraRischioRotte(s, () => 0); // tiro 1 → sempre colpito
  assert.equal(esito.colpita, true);
  assert.equal(esito.tiro, 1);
  assert.equal(esito.rischioPct, 10);
  assert.equal(esito.perso, 5);
  assert.equal(s.materiali.Legna, 5);
});

test('tiro: nessun attacco se il tiro supera il rischio', () => {
  const s = {
    strutture: [],
    materiali: { Legna: 10 },
    rotte: [{ nome: 'Rotta Est', distanza: 100, avampostoUid: null, carico: { materiale: 'Legna', quantita: 10 } }],
  };
  const [esito] = tiraRischioRotte(s, () => 0.99); // tiro 100
  assert.equal(esito.colpita, false);
  assert.equal(esito.perso, null);
  assert.equal(s.materiali.Legna, 10);
});

test('tiro: il magazzino non scende sotto zero', () => {
  const s = {
    strutture: [],
    materiali: { Legna: 2 },
    rotte: [{ nome: 'Rotta Est', distanza: 100, avampostoUid: null, carico: { materiale: 'Legna', quantita: 10 } }],
  };
  tiraRischioRotte(s, () => 0);
  assert.equal(s.materiali.Legna, 0);
});

test('tiro: senza carico dichiarato nessuna perdita, ma il tiro avviene', () => {
  const s = { strutture: [], materiali: {}, rotte: [{ nome: 'Scoperta', distanza: 300, avampostoUid: null }] };
  const [esito] = tiraRischioRotte(s, () => 0);
  assert.equal(esito.colpita, true);
  assert.equal(esito.rischioPct, 20);
  assert.equal(esito.perso, null);
});

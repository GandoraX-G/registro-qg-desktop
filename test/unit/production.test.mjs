/* Produzione mensile: stagioni, raffineria, scelta della Miniera,
   allevamento e satelliti. Catalogo e modificatori sono finti, così il test
   descrive la regola senza dipendere dal regolamento reale. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaProduzioneMensile, haRaffineria } from '../../src/engine/production.js';

const CATALOGO = [
  {
    id: 'campo_coltivato', nome: 'Campo Coltivato', categoria: 'Produzione', personale: 1, materiali: [],
    produzione: { materiale: 'Beni vegetali', materialeRaffinato: 'Beni vegetali raffinati', base: 4, perLivello: 2, stagionale: true },
  },
  {
    id: 'miniera', nome: 'Miniera', categoria: 'Produzione', personale: 1, materiali: [],
    produzione: {
      materiale: 'Ferro', base: 0, perLivello: 0,
      scelte: [
        { materiale: 'Ferro', livelloMin: 1, base: 2, perLivello: 1 },
        { materiale: 'Oro', livelloMin: 2, base: 1, perLivello: 1 },
      ],
    },
  },
  {
    id: 'fattoria', nome: 'Fattoria', categoria: 'Produzione', personale: 1, materiali: [],
    produzione: { materiale: 'Carne animale', base: 0, perLivello: 0 },
  },
  { id: 'raffineria', nome: 'Raffineria', categoria: 'Produzione', personale: 1, materiali: [] },
];

const MODIFICATORI = { Primavera: 10, Estate: 5, Autunno: -5, Inverno: -10 };
const OPZIONI = { modificatoriStagionali: MODIFICATORI, raffineriaId: 'raffineria' };

function stato(strutture, { stagione = 'Primavera', satelliti = [] } = {}) {
  return { strutture, satelliti, calendario: { mese: 1, stagione }, materiali: {} };
}

test('campo coltivato: base + livello + modificatore stagionale', () => {
  const righe = calcolaProduzioneMensile(
    stato([{ uid: 'c1', catId: 'campo_coltivato', livello: 1 }]),
    CATALOGO, OPZIONI,
  );
  assert.equal(righe.length, 1);
  assert.equal(righe[0].materiale, 'Beni vegetali');
  assert.equal(righe[0].quantita, 4 + 2 + 10);
});

test('campo coltivato: in inverno la produzione non va sotto zero', () => {
  const righe = calcolaProduzioneMensile(
    stato([{ uid: 'c1', catId: 'campo_coltivato', livello: 1 }], { stagione: 'Inverno' }),
    CATALOGO, OPZIONI,
  );
  assert.equal(righe[0].quantita, 0);
});

test('raffineria: la produzione passa alla versione raffinata', () => {
  const s = stato([
    { uid: 'c1', catId: 'campo_coltivato', livello: 1 },
    { uid: 'r1', catId: 'raffineria', livello: 1 },
  ]);
  assert.equal(haRaffineria(s, 'raffineria'), true);
  const righe = calcolaProduzioneMensile(s, CATALOGO, OPZIONI);
  assert.equal(righe.find(r => r.strutturaUid === 'c1').materiale, 'Beni vegetali raffinati');
});

test('miniera: usa la scelta disponibile al livello, altrimenti la più bassa', () => {
  const livello1 = calcolaProduzioneMensile(
    stato([{ uid: 'm1', catId: 'miniera', livello: 1 }]), CATALOGO, OPZIONI,
  );
  assert.equal(livello1[0].materiale, 'Ferro');
  assert.equal(livello1[0].quantita, 3);

  const livello2 = calcolaProduzioneMensile(
    stato([{ uid: 'm1', catId: 'miniera', livello: 2, produzioneScelta: 'Oro' }]), CATALOGO, OPZIONI,
  );
  assert.equal(livello2[0].materiale, 'Oro');
  assert.equal(livello2[0].quantita, 3);
});

test('fattoria: le pecore producono stoffa pari a pecore + livello', () => {
  const righe = calcolaProduzioneMensile(
    stato([{ uid: 'f1', catId: 'fattoria', livello: 2, animali: { Pecora: 3, Gallina: 5 } }]),
    CATALOGO, OPZIONI,
  );
  const stoffa = righe.find(r => r.materiale === 'Stoffa');
  assert.equal(stoffa.quantita, 5);
});

test('senza pecore nessuna riga di stoffa', () => {
  const righe = calcolaProduzioneMensile(
    stato([{ uid: 'f1', catId: 'fattoria', livello: 2, animali: { Pecora: 0 } }]), CATALOGO, OPZIONI,
  );
  assert.equal(righe.find(r => r.materiale === 'Stoffa'), undefined);
});

test('satelliti: producono come una struttura di livello 1', () => {
  const righe = calcolaProduzioneMensile(
    stato([], { satelliti: [{ uid: 's1', catId: 'campo_coltivato', nomeCitta: 'Samat' }] }),
    CATALOGO, OPZIONI,
  );
  assert.equal(righe.length, 1);
  assert.match(righe[0].nome, /satellite/);
  assert.equal(righe[0].quantita, 4 + 2 + 10);
});

test('strutture sconosciute al catalogo vengono saltate', () => {
  const righe = calcolaProduzioneMensile(stato([{ uid: 'x', catId: 'ignota', livello: 1 }]), CATALOGO, OPZIONI);
  assert.deepEqual(righe, []);
});

import { COSTO_LAVORATORE_MESE, COSTO_ROTTA_MO_PER_100KM } from '../core/config.js';
import { state as statoGlobale } from '../core/state.js';

/* Costi ricorrenti del QG. Come il resto del motore, accetta lo stato come
   parametro: i test possono calcolare un mese su uno stato finto. */

function costoMensileRotte(s = statoGlobale, per100 = COSTO_ROTTA_MO_PER_100KM) {
  return s.rotte.reduce((somma, rotta) => somma + (rotta.distanza / 100) * per100, 0);
}

function costiFissiDettaglio(s = statoGlobale, costoPerLavoratore = COSTO_LAVORATORE_MESE) {
  return [
    {
      voce: "Stipendi lavoratori",
      base: `${s.lavoratori} lavorator${s.lavoratori === 1 ? "e" : "i"} × ${costoPerLavoratore} mo`,
      importo: s.lavoratori * costoPerLavoratore,
    },
  ];
}

function costiVariabiliDettaglio(s = statoGlobale, per100 = COSTO_ROTTA_MO_PER_100KM) {
  const kmTot = s.rotte.reduce((somma, rotta) => somma + Number(rotta.distanza || 0), 0);
  return [
    {
      voce: "Rotte commerciali",
      base: s.rotte.length ? `${kmTot} km totali × ${per100} mo/100km` : "Nessuna rotta attiva",
      importo: costoMensileRotte(s, per100),
    },
  ];
}

function costiFissiMensili(s = statoGlobale) {
  return costiFissiDettaglio(s).reduce((somma, riga) => somma + riga.importo, 0);
}

function costiVariabiliMensili(s = statoGlobale) {
  return costiVariabiliDettaglio(s).reduce((somma, riga) => somma + riga.importo, 0);
}

function costoMensileTotale(s = statoGlobale) {
  return costiFissiMensili(s) + costiVariabiliMensili(s);
}

function registraMovimento(label, importo, s = statoGlobale) {
  s.oro += importo;
  const adesso = new Date();
  s.movimenti.unshift({
    data: adesso.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " +
          adesso.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
    label,
    importo,
    saldoDopo: s.oro,
  });
  if (s.movimenti.length > 60) s.movimenti.length = 60;
}

function oroDisponibile(s = statoGlobale) {
  return s.oro - (s.riservaBancaria || 0);
}

export {
  costoMensileRotte,
  costiFissiDettaglio,
  costiVariabiliDettaglio,
  costiFissiMensili,
  costiVariabiliMensili,
  costoMensileTotale,
  registraMovimento,
  oroDisponibile,
};

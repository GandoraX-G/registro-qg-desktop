import { state } from '../core/state.js';
import { COSTO_ROTTA_MO_PER_100KM } from '../core/config.js';

function costoMensileRotte(){
  return state.rotte.reduce((sum,r)=> sum + (r.distanza/100)*COSTO_ROTTA_MO_PER_100KM, 0);
}

function costiFissiDettaglio(){
  return [
    {
      voce: "Stipendi lavoratori",
      base: `${state.lavoratori} lavorator${state.lavoratori===1?"e":"i"} × 1 mo`,
      importo: state.lavoratori
    }
  ];
}

function costiVariabiliDettaglio(){
  const righe = [];
  const kmTot = state.rotte.reduce((s,r)=>s+Number(r.distanza||0),0);
  righe.push({
    voce: "Rotte commerciali",
    base: state.rotte.length ? `${kmTot} km totali × 5 mo/100km` : "Nessuna rotta attiva",
    importo: costoMensileRotte()
  });
  return righe;
}

function costiFissiMensili(){
  return costiFissiDettaglio().reduce((s,r)=>s+r.importo,0);
}

function costiVariabiliMensili(){
  return costiVariabiliDettaglio().reduce((s,r)=>s+r.importo,0);
}

function costoMensileTotale(){
  return costiFissiMensili() + costiVariabiliMensili();
}

function registraMovimento(label, importo){
  state.oro += importo;
  state.movimenti.unshift({
    data: new Date().toLocaleDateString("it-IT", {day:"2-digit", month:"2-digit", year:"numeric"}) + " " +
          new Date().toLocaleTimeString("it-IT", {hour:"2-digit", minute:"2-digit"}),
    label,
    importo,
    saldoDopo: state.oro
  });
  if(state.movimenti.length > 60) state.movimenti.length = 60;
}

function oroDisponibile(){
  return state.oro - (state.riservaBancaria || 0);
}

export {
  costoMensileRotte,
  costiFissiDettaglio,
  costiVariabiliDettaglio,
  costiFissiMensili,
  costiVariabiliMensili,
  costoMensileTotale,
  registraMovimento,
  oroDisponibile
};

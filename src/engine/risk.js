import { state } from '../core/state.js';
import { RISCHIO_ROTTA_BASE, RISCHIO_ROTTA_PER_100KM } from '../core/config.js';
import { kmDifesiRotta } from '../modules/outpost.js';

function calcRischio(distanza, difesa){
  const dif = Math.min(Number(difesa)||0, Number(distanza)||0);
  const nonDifesi = Math.max(0,(Number(distanza)||0) - dif);
  if(nonDifesi <= 0) return 0;
  const blocchi = Math.ceil(nonDifesi/100);
  return Math.min(100, RISCHIO_ROTTA_BASE + RISCHIO_ROTTA_PER_100KM*blocchi);
}

function tiraRischioRotte(){
  return state.rotte.map(r=>{
    const difesa = kmDifesiRotta(r);
    const rischioPct = calcRischio(r.distanza, difesa);
    const tiro = Math.floor(Math.random()*100)+1;
    const colpita = tiro <= rischioPct;
    let perso = null;
    if(colpita && r.carico && r.carico.materiale && r.carico.quantita>0){
      perso = Math.ceil(r.carico.quantita/2);
      state.materiali[r.carico.materiale] = Math.max(0, (state.materiali[r.carico.materiale]||0) - perso);
    }
    return { rotta: r.nome, rischioPct, tiro, colpita, materiale: r.carico?.materiale||null, perso };
  });
}

export {
  calcRischio,
  tiraRischioRotte
};

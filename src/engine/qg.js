import { state } from '../core/state.js';
import { CATALOGO, PUNTI_QG_MAX, MATERIALI_PREZZI } from '../core/config.js';

function puntiCosto(struttura){
  if(struttura.exempt) return 0;
  if(struttura.categoria === "Generali") return 2;
  if(struttura.categoria === state.classe) return 2;
  return 4;
}

function puntiSpesiTotali(){
  return state.strutture.reduce((sum, s)=>{
    const cat = CATALOGO.find(c=>c.id===s.catId);
    if(!cat) return sum;
    return sum + puntiCosto(cat) * s.livello;
  }, 0);
}

function personaleRichiesto(){
  return state.strutture.reduce((sum,s)=>{
    const cat = CATALOGO.find(c=>c.id===s.catId);
    return sum + (cat ? cat.personale : 0);
  },0);
}

function valoreMagazzino(){
  return Object.entries(state.materiali).reduce((sum,[m,q])=>{
    const prezzo = MATERIALI_PREZZI[m] || 0;
    return sum + prezzo * (q||0);
  },0);
}

function contaStruttureCategoria(cat){
  return state.strutture.filter(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    return c && c.categoria===cat;
  }).length;
}

function hasStrutturaSpecializzata(){
  return state.strutture.some(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    return c && c.categoria !== "Generali";
  });
}

export {
  puntiCosto,
  puntiSpesiTotali,
  personaleRichiesto,
  valoreMagazzino,
  contaStruttureCategoria,
  hasStrutturaSpecializzata
};

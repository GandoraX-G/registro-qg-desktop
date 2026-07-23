import { state } from '../core/state.js';
import { CATALOGO } from '../core/config.js';

function calcolaTokenMensili(){
  const generati = { miniera: 0, pesca: 0, concime: 0 };
  state.strutture.forEach(s=>{
    const c = CATALOGO.find(x=>x.id===s.catId);
    const tipo = c && c.produzione && c.produzione.token;
    if(tipo && generati[tipo] !== undefined) generati[tipo]++;
  });
  if (state.satelliti && state.satelliti.length > 0) {
    state.satelliti.forEach(sat => {
      const c = CATALOGO.find(x => x.id === sat.catId);
      const tipo = c && c.produzione && c.produzione.token;
      if (tipo && generati[tipo] !== undefined) generati[tipo]++;
    });
  }
  return generati;
}

export {
  calcolaTokenMensili
};

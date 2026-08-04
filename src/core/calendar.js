import { CALENDARIO_ORDINE_STAGIONI } from './config.js';

export { CALENDARIO_ORDINE_STAGIONI };

export function prossimaStagione(stagioneAttuale){
  const idx = CALENDARIO_ORDINE_STAGIONI.indexOf(stagioneAttuale);
  return CALENDARIO_ORDINE_STAGIONI[(idx+1) % CALENDARIO_ORDINE_STAGIONI.length] || stagioneAttuale;
}

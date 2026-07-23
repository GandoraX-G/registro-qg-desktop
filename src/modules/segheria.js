import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setSegheriaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export const ALBERI_LUOGO = [
  { nome: 'Legno Cinereo',     elemento: 'Fuoco' },
  { nome: 'Corteccia Irian',   elemento: 'Radioso' },
  { nome: 'Frutto Kyrtharian', elemento: 'Acido o Veleno' },
  { nome: 'Quercia Lammanian', elemento: 'Fulmine o Tuono' },
  { nome: 'Legno Mabaran',     elemento: 'Necrotico' },
  { nome: 'Pino Artico',       elemento: 'Freddo' },
  { nome: 'Betulla Eterea',    elemento: 'Psichico' },
  { nome: 'Legno Xorian',      elemento: 'Forza' },
  { nome: 'Camelia Gialla',    elemento: '+1d4 cure' }
];

export function scegliAlberoSegheria(uidStr, nomeAlbero){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="segheria");
  if(!s) return;
  s.alberoScelto = nomeAlbero || null;
  renderAll(); saveState();
}

export function ottieniSemeOLio(uidStr, tipo){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="segheria");
  if(!s) return;
  if(!s.alberoScelto){ showToast('Scegli prima un tipo di albero ⚠'); return; }
  const costoLegna = tipo === 'seme' ? 30 : 10;
  if((state.materiali['Legna']||0) < costoLegna){ showToast(`Servono ${costoLegna} unità di Legna ⚠`); return; }
  state.materiali['Legna'] -= costoLegna;
  const albero = ALBERI_LUOGO.find(a=>a.nome === s.alberoScelto);
  if(tipo === 'seme'){
    const nome = `Seme ${s.alberoScelto}`;
    if(!s.semiProdotti) s.semiProdotti = [];
    s.semiProdotti.push(nome);
    showToast(`Ottenuto 1 ${nome} (−30 Legna) — utilizzabile nel Giardino o come materiale da crafting`);
  }else{
    const nome = `Olio di ${s.alberoScelto}`;
    if(!s.oliProdotti) s.oliProdotti = [];
    s.oliProdotti.push({ nome, elemento: albero ? albero.elemento : '?' });
    showToast(`Ottenuto 1 ${nome} (${albero ? albero.elemento : '?'}) — −10 Legna`);
  }
  renderAll(); saveState();
}

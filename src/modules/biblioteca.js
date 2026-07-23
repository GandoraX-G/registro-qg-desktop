import { state } from '../core/state.js';
import { ARGOMENTI_BIBLIOTECA, TEMI_BIBLIOTECA_SCELTE } from '../core/config.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setBibliotecaRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function toggleTemaBiblioteca(uidStr, tema){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s) return;
  const arg = ARGOMENTI_BIBLIOTECA.find(a=>a.nome===tema);
  if(arg && !arg.selezionabile){ showToast(`"${tema}" non è selezionabile come tema (regolamento)`); return; }
  const idx = s.temi.indexOf(tema);
  if(idx>=0){
    s.temi.splice(idx,1);
  }else{
    if(s.temi.length >= TEMI_BIBLIOTECA_SCELTE){ showToast(`Hai già scelto ${TEMI_BIBLIOTECA_SCELTE} temi: rimuovine uno prima di aggiungerne un altro`); return; }
    s.temi.push(tema);
  }
  renderAll(); saveState();
}

export function aggiungiTemaPersonalizzato(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s || !nome) return;
  if(s.temi.includes(nome)){ showToast("Tema già presente"); return; }
  s.temi.push(nome);
  showToast(`Nuovo tema "${nome}" aggiunto (richiede almeno 3 libri sulla materia, da narrativa)`);
  renderAll(); saveState();
}

export function avviaIndagineTema(uidStr, tema, personaggio){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s || !tema || !personaggio) return;
  s.indagini.push({ id: uid(), tipo: "tema", argomento: tema, personaggio, meseScadenza: state.calendario.mese + 1 });
  showToast(`Indagine avviata: +5 alle prove su "${tema}" per ${personaggio} fino al mese ${state.calendario.mese+1}`);
  renderAll(); saveState();
}

export function aggiungiSottospecieBestiario(uidStr, nome){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s || !nome) return;
  if(s.bestiario.find(b=>b.nome===nome)){ showToast("Sottospecie già nel Bestiario"); return; }
  s.bestiario.push({ id: uid(), nome, materiali: 0 });
  renderAll(); saveState();
}

export function aggiungiMaterialeBestiario(uidStr, voceId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s) return;
  const v = s.bestiario.find(b=>b.id===voceId);
  if(!v || v.materiali>=3) return;
  v.materiali++;
  if(v.materiali>=3) showToast(`${v.nome} sbloccata nel Bestiario!`);
  renderAll(); saveState();
}

export function avviaIndagineBestiario(uidStr, voceId, personaggio){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  const v = s && s.bestiario.find(b=>b.id===voceId);
  if(!s || !v || v.materiali<3 || !personaggio) return;
  s.indagini.push({ id: uid(), tipo: "bestiario", argomento: v.nome, personaggio, meseScadenza: state.calendario.mese + 1 });
  showToast(`Indagine sul Bestiario avviata: +1d6 contro ${v.nome} per ${personaggio} fino al mese ${state.calendario.mese+1}`);
  renderAll(); saveState();
}

export function rimuoviIndagine(uidStr, indagineId){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="biblioteca");
  if(!s) return;
  s.indagini = s.indagini.filter(i=>i.id!==indagineId);
  renderAll(); saveState();
}

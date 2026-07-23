import { state } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { showToast } from '../ui/toast.js';
import { uid, fmtMo } from '../utils/format.js';
import { registraMovimento, oroDisponibile } from '../engine/finance.js';

let _renderAll, _renderSottomeccaniche;
export function setSantuarioRenderCallbacks(ra, rs) { _renderAll = ra; _renderSottomeccaniche = rs; }
function renderAll() { if (_renderAll) _renderAll(); }
function renderSottomeccaniche() { if (_renderSottomeccaniche) _renderSottomeccaniche(); }

export function costoCatalizzatore(santuario){ return 150 * santuario.livello; }

export function gsMassimoCatalizzatore(santuario){ return 3 * santuario.livello; }

export function costruisciCatalizzatore(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="santuario");
  if(!s || s.catalizzatore) return;
  const costo = costoCatalizzatore(s);
  if(oroDisponibile() < costo){ showToast(`Oro insufficiente: servono ${costo} mo oltre la riserva bancaria ⚠`); return; }
  if(!confirm(`Costruire un Catalizzatore d'Essenza per ${costo} mo (GS massimo assorbibile: ${gsMassimoCatalizzatore(s)})?`)) return;
  registraMovimento(`Catalizzatore d'Essenza (Santuario)`, -costo);
  s.catalizzatore = { stato: "vuoto" };
  showToast("Catalizzatore costruito");
  renderAll(); saveState();
}

export function caricaCatalizzatore(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="santuario");
  if(!s || !s.catalizzatore || s.catalizzatore.stato!=="vuoto") return;
  if(!confirm(`Assorbire l'essenza di una creatura (GS massimo ${gsMassimoCatalizzatore(s)}, incapacitata/morta da meno di un'ora/consenziente)? Se viva, subisce 3 livelli di affaticamento al termine.`)) return;
  s.catalizzatore.stato = "carico";
  showToast("Catalizzatore carico");
  renderAll(); saveState();
}

export function trasferisciCatalizzatore(uidStr){
  const s = state.strutture.find(x=>x.uid===uidStr && x.catId==="santuario");
  if(!s || !s.catalizzatore || s.catalizzatore.stato!=="carico") return;
  const haStudioArcano = state.strutture.some(x=>x.catId==="studio_arcano");
  if(!haStudioArcano){ showToast("Il trasferimento va effettuato in uno Studio Arcano: non ne hai ancora costruito uno ⚠"); return; }
  if(!confirm("Trasferire l'essenza in uno Studio Arcano? Verifica i requisiti del bersaglio (tipo creatura, non caricato, evocato o con caratteristica aumentata magicamente in modo permanente) prima di procedere.")) return;
  s.catalizzatore.stato = "in_attesa";
  showToast("Essenza trasferita: il catalizzatore è scarico e tornerà disponibile alla prossima chiusura del mese");
  renderAll(); saveState();
}

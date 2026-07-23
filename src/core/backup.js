import { state } from './state.js';
import { saveState } from './persistence.js';
import { callRenderAll } from './state.js';
import { showToast } from '../ui/toast.js';

export function exportBackup(){
  try{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dataOggi = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `QG_backup_${(state.nome||"registro").replace(/[^a-z0-9]+/gi,"_")}_${dataOggi}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup scaricato");
  }catch(e){
    console.error("Errore nell'esportazione", e);
    showToast("Errore nell'esportazione ⚠");
  }
}

export function importBackup(file){
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const parsed = JSON.parse(ev.target.result);
      if(typeof parsed !== "object" || parsed === null) throw new Error("Formato non valido");
      if(!confirm("Importare questo backup sovrascriverà il registro attuale su questo dispositivo. Continuare?")) return;
      Object.assign(state, {
        nome:"Il mio Quartier Generale", fondatore:"", cofondatore:"", classe:"Nessuna", livello:1,
        oro:0, membri:[], strutture:[], materiali:{}, lavoratori:0, rotte:[], magazzinoScontati:[], movimenti:[],
        riservaBancaria:0, registroAltriQG:[],
        calendario:{ mese:1, stagione:"Primavera" }, clima:"Mite",
        token:{ miniera:0, pesca:0, concime:0 }, tokenConcimeDaSpendere:0, tokenMinieraDaSpendere:0, tokenPescaDaSpendere:0,
        satelliti:[], resocontoUltimoMese:null
      }, parsed);
      saveState();
      callRenderAll();
      showToast("Backup importato");
    }catch(e){
      console.error("Errore nell'importazione", e);
      showToast("File di backup non valido ⚠");
    }
  };
  reader.readAsText(file);
}

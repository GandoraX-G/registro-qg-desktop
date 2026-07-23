import { state } from './state.js';
import { saveState, TAURI_DISPONIBILE } from './persistence.js';
import { callRenderAll } from './state.js';
import { showToast } from '../ui/toast.js';

const defaultState = {
  nome:"Il mio Quartier Generale", fondatore:"", cofondatore:"", classe:"Nessuna", livello:1,
  oro:0, membri:[], strutture:[], materiali:{}, lavoratori:0, rotte:[],
  magazzinoScontati:[], movimenti:[], riservaBancaria:0, registroAltriQG:[],
  calendario:{ mese:1, stagione:"Primavera" }, clima:"Mite",
  token:{ miniera:0, pesca:0, concime:0 }, tokenConcimeDaSpendere:0, tokenMinieraDaSpendere:0, tokenPescaDaSpendere:0,
  satelliti:[], resocontoUltimoMese:null
};

export async function exportBackup(){
  try{
    if(TAURI_DISPONIBILE){
      const nomeFile = `QG_backup_${(state.nome||"registro").replace(/[^a-z0-9]+/gi,"_")}_${new Date().toISOString().slice(0,10)}.json`;
      const percorso = await window.__TAURI__.core.invoke("esporta_backup", {
        contenuto: JSON.stringify(state, null, 2),
        nomeSuggerito: nomeFile
      });
      showToast("Backup salvato in " + percorso);
    }else{
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
    }
  }catch(e){
    console.error("Errore nell'esportazione", e);
    showToast("Errore nell'esportazione \u26a0");
  }
}

export async function importBackup(){
  try{
    if(TAURI_DISPONIBILE){
      const raw = await window.__TAURI__.core.invoke("importa_backup");
      applicaBackup(raw);
    }else{
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (e)=>{
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev)=> applicaBackup(ev.target.result);
        reader.readAsText(file);
      };
      input.click();
    }
  }catch(e){
    if(e && String(e).includes("Nessun file selezionato")) return;
    console.error("Errore nell'importazione", e);
    showToast("Errore nell'importazione \u26a0");
  }
}

function applicaBackup(raw){
  try{
    const parsed = JSON.parse(raw);
    if(typeof parsed !== "object" || parsed === null) throw new Error("Formato non valido");
    if(!confirm("Importare questo backup sovrascriver\u00e0 il registro attuale su questo dispositivo. Continuare?")) return;
    Object.assign(state, defaultState, parsed);
    saveState();
    callRenderAll();
    showToast("Backup importato");
  }catch(e){
    console.error("Errore nell'importazione", e);
    showToast("File di backup non valido \u26a0");
  }
}

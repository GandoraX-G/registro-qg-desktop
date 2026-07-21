/* ============================================================
   GUIDE — Dynamic rendering from regolamento.json
   "What's New", search, collapsible sections
   ============================================================ */

const GUIDE_WHATS_NEW = {
  title: "Cosa c'è di nuovo",
  items: [
    {
      date: "2026-03",
      title: "Versione v2.1 — Interfaccia Ridisegnata",
      desc: "Dashboard completamente rinnovata con tema Dark Fantasy, layout responsive e nuova sezione Guide interattiva."
    },
    {
      date: "2026-02",
      title: "Supporto Strutture Nuove",
      desc: "Aggiunte tutte le 28 strutture del regolamento. Sistema di Calcolo Punti QG automatico."
    }
  ]
};

let currentGuideSearch = "";

async function renderGuideModal() {
  const bg = document.getElementById("guideModalBg");
  const modal = bg.querySelector(".modal");
  
  if (!modal) return; // Modal non inizializzato
  
  // Header
  const header = document.createElement("div");
  header.className = "guide-header";
  header.innerHTML = `
    <h4>📖 Guida Completa al Quartier Generale</h4>
    <p>Regolamento di gioco, catalogo strutture e funzioni dell'app — Cronache di Unshast</p>
  `;
  
  // Search input
  const searchWrap = document.createElement("div");
  searchWrap.className = "guide-search-wrap";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 Cerca regole, strutture, costi…";
  searchInput.addEventListener("input", (e) => {
    currentGuideSearch = e.target.value.toLowerCase();
    renderGuideContent(bg.querySelector(".guide-content"));
  });
  searchWrap.appendChild(searchInput);
  
  // Content container
  const content = document.createElement("div");
  content.className = "guide-content";
  
  // Clear old content and rebuild
  while (modal.children.length > 3) modal.removeChild(modal.lastChild); // Keep close button, h3, intro
  
  const intro = modal.querySelector(".guide-intro");
  if (intro) {
    intro.parentNode.insertBefore(header, intro);
    intro.parentNode.insertBefore(searchWrap, intro.nextSibling);
  }
  
  modal.appendChild(content);
  renderGuideContent(content);
}

function renderGuideContent(container) {
  if (!container) return;
  
  container.innerHTML = "";
  
  // "What's New" Section
  const whatsNewSection = document.createElement("details");
  whatsNewSection.open = true;
  whatsNewSection.innerHTML = `
    <summary>✨ Cosa c'è di nuovo</summary>
    <div class="guide-body">
      ${GUIDE_WHATS_NEW.items.map(item => `
        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line);">
          <b>${item.title}</b> <span style="color: var(--brass);">(${item.date})</span><br>
          <span style="font-size: 11px; line-height: 1.5;">${item.desc}</span>
        </div>
      `).join("")}
    </div>
  `;
  container.appendChild(whatsNewSection);
  
  // Game Rules
  const rulesSection = document.createElement("details");
  const rulesMatch = !currentGuideSearch || "regole, qg, classe, punti, livello".includes(currentGuideSearch);
  if (rulesMatch) {
    rulesSection.innerHTML = `
      <summary>📜 Come funziona un Quartier Generale</summary>
      <div class="guide-body">
        <b>Cos'è un QG?</b><br>
        È la base operativa del gruppo di avventurieri: produce risorse, genera oro, offre servizi
        e va gestito mese per mese come un vero sistema economico.
        <br><br>
        <b>Apertura:</b> Servono <b>2 personaggi</b> (Fondatore + Co-fondatore) e <b>300 mo</b> di capitale.
        Si parte <b>Senza Classe</b>, a <b>Livello 1</b>.
        <br><br>
        <b>Classe del QG:</b> Si ottiene automaticamente alla costruzione della prima
        Struttura Specializzata (Produzione, Vendita o Militare). Una volta scelta, il menu si blocca
        per evitare cambi indesiderati.
        <br><br>
        <b>Punti QG:</b> Budget totale di 44 punti per costruire strutture:
        <ul>
          <li>Strutture Generali: 2 punti</li>
          <li>Strutture della propria Classe: 2 punti</li>
          <li>Strutture specializzate di Classe diversa: 4 punti</li>
          <li>Strutture esenti (Impresa, Avamposto): 0 punti</li>
        </ul>
        <b>Livello QG:</b> Calcolato dal livello dei tuoi personaggi
        (Lv 3–6 → QG Lv. 1; 7–10 → Lv. 2, ecc.). Massimo attuale: Lv. 3.
      </div>
    `;
    container.appendChild(rulesSection);
  }
  
  // Structures Catalog
  if (!currentGuideSearch || "strutture, catalogo, edifici".includes(currentGuideSearch)) {
    const structSection = document.createElement("details");
    structSection.innerHTML = `
      <summary>🏛️ Catalogo Strutture (28 edifici)</summary>
      <div class="guide-body">
        <b>Generali (7):</b> Biblioteca, Giardino, Sala Contatti, Santuario, Impresa, Struttura da Lavoro, Studio Arcano
        <br><br>
        <b>Produzione (8):</b> Campo Coltivato, Miniera, Pescheria, Segheria, Bottega Artistica, Fattoria, Raffineria
        <br><br>
        <b>Vendita (7):</b> Fabbro, Magazzino, Alchimista, Sartoria, Locanda, Sala di Svago, Servizio Edile
        <br><br>
        <b>Militare (6):</b> Avamposto, Studio Diplomatico, Sala Arcana, Porto Militare, Eliporto Arcano, Campo d'Addestramento, Sala da Guerra
        <br><br>
        Ogni struttura ha: <b>costo (mo)</b>, <b>personale richiesto</b>, <b>materiali</b>, <b>effetti</b>.
        Vedi tab "Strutture" per il catalogo completo con filtri e costruzione.
      </div>
    `;
    container.appendChild(structSection);
  }
  
  // Finance & Costs
  if (!currentGuideSearch || "finanze, oro, costi, stipendi".includes(currentGuideSearch)) {
    const financeSection = document.createElement("details");
    financeSection.innerHTML = `
      <summary>💰 Finanze e Costi Mensili</summary>
      <div class="guide-body">
        <b>Costi Fissi:</b><br>
        <ul>
          <li><b>Personale:</b> 1 mo per lavoratore al mese</li>
          <li><b>Rotte Commerciali:</b> 5 mo ogni 100 km, pagati il 1° del mese</li>
        </ul>
        <b>Riserva Bancaria:</b> Un importo che l'app non userà automaticamente per costruzioni/acquisti.
        Utile per evitare che un'azione volontaria svuoti la tesoreria.
        <br><br>
        <b>"Chiudi Mese":</b> Bottone che applica tutti i costi ricorrenti, genera Token (Miniera, Pesca, Concime),
        calcola il saldo finale e registra il movimento nello storico.
      </div>
    `;
    container.appendChild(financeSection);
  }
  
  // Trade Routes
  if (!currentGuideSearch || "rotte, commerciali, avamposto, km".includes(currentGuideSearch)) {
    const routeSection = document.createElement("details");
    routeSection.innerHTML = `
      <summary>🗺️ Rotte Commerciali e Avamposti</summary>
      <div class="guide-body">
        <b>Rotte:</b> Collegano il QG a destinazioni esterne. Costano 5 mo ogni 100 km (pagati mensilmente).
        <br><br>
        <b>Rischio perdita:</b> 5% base + 5% per ogni 100 km non coperti da un Avamposto.
        Consigliato restare sotto i <b>400 km totali</b> a inizio gioco.
        <br><br>
        <b>Avamposto:</b> Costano 30 mo, non contano Punti QG. Proteggono fino a <b>400 km × Livello</b>.
        Un Avamposto può difendere una sola rotta alla volta.
      </div>
    `;
    container.appendChild(routeSection);
  }
  
  // Materials & Warehouse
  if (!currentGuideSearch || "materiali, magazzino, prezzo".includes(currentGuideSearch)) {
    const matSection = document.createElement("details");
    matSection.innerHTML = `
      <summary>📦 Materiali e Magazzino</summary>
      <div class="guide-body">
        <b>Prezzo Unitario:</b> Seguono il listino ufficiale di Unshast.
        <br><br>
        <b>Sconti su Acquisto:</b>
        <ul>
          <li><b>−20%</b> quando compri da un altro QG (invece che al Bazaar)</li>
          <li><b>−30%</b> se il materiale è tra i 5 "scontati" dal tuo Magazzino</li>
        </ul>
        <b>Magazzino Scontati:</b> Puoi scegliere fino a 5 materie prime che ricevono lo sconto extra.
        Utile per specializzare la tua economia.
      </div>
    `;
    container.appendChild(matSection);
  }
  
  // Tab-by-tab Guide
  if (!currentGuideSearch || "app, funzioni, tab, uso".includes(currentGuideSearch)) {
    const tabSection = document.createElement("details");
    tabSection.innerHTML = `
      <summary>💻 Come usare l'App — Le Tab</summary>
      <div class="guide-body">
        <b>Panoramica:</b> Dati del QG, tesoreria, "Movimento rapido" (+/− oro rapido),
        barra Punti QG, lista membri, riepilogo strutture per categoria.
        <br><br>
        <b>Strutture:</b> Catalogo filtrabile per categoria. Bottone "Costruisci" verifica oro/materiali/punti
        e scala automaticamente. Elenco strutture possedute con "Potenzia" e "Smantella".
        <br><br>
        <b>Magazzino:</b> Acquista materiali con sconti, gestisci inventario, assumi lavoratori.
        Bottone "⟳ Adegua al fabbisogno" imposta i lavoratori al numero richiesto in un click.
        <br><br>
        <b>Rotte Commerciali:</b> Aggiungi rotte, calcolo automatico di costo mensile e rischio.
        Assegna avamposti a difesa. Avviso se superi i 400 km.
        <br><br>
        <b>Finanze:</b> Tabelle Costi Fissi e Costi Variabili. Bottone "Chiudi mese" applica automaticamente.
        Storico movimenti registrato da solo.
      </div>
    `;
    container.appendChild(tabSection);
  }
  
  // Save & Backup
  if (!currentGuideSearch || "salvataggio, backup, export, import".includes(currentGuideSearch)) {
    const saveSection = document.createElement("details");
    saveSection.innerHTML = `
      <summary>💾 Salvataggio, Backup e Tema</summary>
      <div class="guide-body">
        <b>Salvataggio:</b> I dati si salvano automaticamente in locale su questo dispositivo.
        <b>Non si sincronizzano</b> automaticamente tra PC diversi o telefono.
        <br><br>
        <b>Export/Import:</b> Usa <b>⬇ Esporta backup (JSON)</b> per una copia portatile.
        Importalo su un altro PC con <b>⬆ Importa backup (JSON)</b>.
        <br><br>
        <b>Tema:</b> Bottone Tema nella sidebar alterna chiaro/scuro e ricorda la scelta.
      </div>
    `;
    container.appendChild(saveSection);
  }
}

function initGuide() {
  const guideBtn = document.getElementById("guideBtn");
  const guideModalBg = document.getElementById("guideModalBg");
  const guideCloseBtn = document.getElementById("guideCloseBtn");
  const guideCloseX = document.getElementById("guideCloseX");
  const guideDontShow = document.getElementById("guideDontShow");
  
  if (!guideBtn) return;
  
  guideBtn.addEventListener("click", () => {
    guideModalBg.style.display = "flex";
    renderGuideModal();
  });
  
  guideCloseBtn?.addEventListener("click", () => {
    guideModalBg.style.display = "none";
  });
  
  guideCloseX?.addEventListener("click", () => {
    guideModalBg.style.display = "none";
  });
  
  guideModalBg?.addEventListener("click", (e) => {
    if (e.target === guideModalBg) {
      guideModalBg.style.display = "none";
    }
  });
  
  guideDontShow?.addEventListener("change", (e) => {
    try {
      if (e.target.checked) {
        localStorage.setItem(GUIDE_KEY, "true");
      } else {
        localStorage.removeItem(GUIDE_KEY);
      }
    } catch (err) {
      console.log("Impossibile salvare preferenza guida", err);
    }
  });
  
  // Auto-show on first load (unless hidden)
  try {
    const hidden = localStorage.getItem(GUIDE_KEY);
    if (!hidden && !state.guideSeen) {
      guideModalBg.style.display = "flex";
      renderGuideModal();
      state.guideSeen = true;
    }
  } catch (err) {
    console.log("Storage non disponibile", err);
  }
}

/* ============================================================
   UI.JS — Core rendering, tab switching, form binding
   ============================================================ */

import { scheduleAutoSave, saveState } from "./storage.js";

let globalState = {};
let globalCatalogo = [];
let globalMateriali = {};
let globalConfig = {};

export function initUI(state, catalogo, materiali, config) {
  globalState = state;
  globalCatalogo = catalogo;
  globalMateriali = materiali;
  globalConfig = config;

  setupNavigation();
  setupSidebar();
  setupForms();
}

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-tab]");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });
}

export function switchTab(tabName) {
  // Hide all sections
  const sections = document.querySelectorAll(".main > section");
  sections.forEach((s) => (s.style.display = "none"));

  // Show the target section
  const target = document.getElementById(`tab-${tabName}`);
  if (target) {
    target.style.display = "block";
  }

  // Update active nav
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((n) => n.classList.remove("active"));
  const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeNav) {
    activeNav.classList.add("active");
  }

  globalState.currentTab = tabName;
  renderTabContent(tabName);
}

function renderTabContent(tabName) {
  switch (tabName) {
    case "panoramica":
      renderPanoramica();
      break;
    case "strutture":
      renderStrutture();
      break;
    case "magazzino":
      renderMagazzino();
      break;
    case "rotte":
      renderRotte();
      break;
    case "finanze":
      renderFinanze();
      break;
  }
}

function renderPanoramica() {
  // Update title and subtitle
  document.getElementById("qgTitleDisplay").textContent = globalState.nome || "Il mio Quartier Generale";
  const sub = `${globalState.classe} · Livello ${globalState.livello}`;
  document.getElementById("qgSubDisplay").textContent = sub;

  // Update stat chips
  document.getElementById("chipOro").textContent = globalState.oro.toLocaleString("it-IT");
  
  let puntiSpesi = 0;
  globalState.strutture.forEach((s) => {
    const str = globalCatalogo.find((c) => c.id === s.catId);
    if (str && !str.exempt) {
      let costo = 2;
      if (str.categoria !== "Generali" && str.categoria !== globalState.classe) {
        costo = 4;
      }
      puntiSpesi += costo;
    }
  });
  document.getElementById("chipPunti").textContent = `${puntiSpesi}/44`;
  document.getElementById("chipStrutture").textContent = globalState.strutture.length.toString();
  
  let personaleRichiesto = 0;
  globalState.strutture.forEach((s) => {
    const str = globalCatalogo.find((c) => c.id === s.catId);
    if (str) personaleRichiesto += str.personale || 0;
  });
  document.getElementById("chipPersonale").textContent = personaleRichiesto.toString();

  // Update progress bar
  const percentuale = (puntiSpesi / 44) * 100;
  document.getElementById("puntiBar").style.width = percentuale + "%";
  document.getElementById("puntiBarLabel").textContent = `${puntiSpesi} / 44`;

  // Bind form inputs
  document.getElementById("inNome").value = globalState.nome || "";
  document.getElementById("inFondatore").value = globalState.fondatore || "";
  document.getElementById("inCofondatore").value = globalState.cofondatore || "";
  document.getElementById("inClasse").value = globalState.classe || "Nessuna";
  document.getElementById("inOro").value = globalState.oro;
  document.getElementById("inLivello").value = globalState.livello;

  // Render members table
  const membriBody = document.getElementById("membriBody");
  membriBody.innerHTML = "";
  globalState.membri.forEach((m) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${m.nome}</td>
      <td>${m.livello}</td>
      <td><button class="btn btn-sm btn-danger" data-remove-membro="${m.uid}">Rimuovi</button></td>
    `;
    membriBody.appendChild(row);
  });

  // Render category summary table
  const riepilogoBody = document.getElementById("riepilogoBody");
  riepilogoBody.innerHTML = "";
  const CATEGORIE = ["Generali", "Produzione", "Vendita", "Militare"];
  CATEGORIE.forEach((cat) => {
    const structs = globalState.strutture.filter((s) => {
      const str = globalCatalogo.find((c) => c.id === s.catId);
      return str && str.categoria === cat;
    });
    const punti = structs.reduce((acc, s) => {
      const str = globalCatalogo.find((c) => c.id === s.catId);
      if (!str || str.exempt) return acc;
      const costo = str.categoria === "Generali" || str.categoria === globalState.classe ? 2 : 4;
      return acc + costo;
    }, 0);
    const row = document.createElement("tr");
    row.innerHTML = `<td>${cat}</td><td>${structs.length}</td><td>${punti}</td>`;
    riepilogoBody.appendChild(row);
  });
}

function renderStrutture() {
  // Render category filters
  const catFilters = document.getElementById("catFilters");
  catFilters.innerHTML = '<button class="cat-filter-btn active" data-filter="Tutte">Tutte</button>';
  ["Generali", "Produzione", "Vendita", "Militare"].forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "cat-filter-btn";
    btn.dataset.filter = cat;
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderCatalog(cat);
    });
    catFilters.appendChild(btn);
  });

  renderCatalog("Tutte");
  renderStruttureCostruite();
}

function renderCatalog(categoria = "Tutte") {
  const catalogGrid = document.getElementById("catalogGrid");
  catalogGrid.innerHTML = "";

  let filtered = globalCatalogo;
  if (categoria !== "Tutte") {
    filtered = globalCatalogo.filter((s) => s.categoria === categoria);
  }

  filtered.forEach((struct) => {
    const card = document.createElement("div");
    card.className = "struct-card";
    
    const costruita = globalState.strutture.some((s) => s.catId === struct.id);
    const livello = globalState.strutture.find((s) => s.catId === struct.id)?.livello || 0;

    const materialiStr = struct.materiali
      ?.map((m) => `${m.u} ${m.m}`)
      .join(", ") || "—";

    card.innerHTML = `
      <h4>
        <span>${struct.nome}</span>
        <span style="font-size: 10px; color: var(--ink-soft);">${struct.costo} mo</span>
      </h4>
      <div class="meta">
        <span class="tag tag-${struct.categoria.toLowerCase()}">${struct.categoria}</span>
        ${costruita ? `<span style="margin-left: auto; color: var(--green-dk);">Lv. ${livello} ✓</span>` : ""}
      </div>
      <div class="desc">${struct.desc}</div>
      <div class="mats"><strong>Materiali:</strong> ${materialiStr}</div>
      <div class="foot">
        <button class="btn btn-sm ${costruita ? "btn-outline" : "btn-brass"}" 
                data-build-struct="${struct.id}">
          ${costruita ? "Potenzia" : "Costruisci"}
        </button>
      </div>
    `;
    catalogGrid.appendChild(card);
  });
}

function renderStruttureCostruite() {
  const table = document.getElementById("strutturePossedute");
  table.innerHTML = "";

  if (globalState.strutture.length === 0) {
    document.getElementById("struttureEmpty").style.display = "block";
  } else {
    document.getElementById("struttureEmpty").style.display = "none";
    globalState.strutture.forEach((s) => {
      const struct = globalCatalogo.find((c) => c.id === s.catId);
      if (!struct) return;

      const costo = struct.exempt ? "—" : struct.categoria === globalState.classe ? "2" : "4";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${struct.nome}</td>
        <td>${struct.categoria}</td>
        <td>${s.livello}</td>
        <td>${costo}</td>
        <td>
          <button class="btn btn-sm btn-danger" data-remove-struct="${s.uid}">Smantella</button>
        </td>
      `;
      table.appendChild(row);
    });
  }
}

function renderMagazzino() {
  // Populate material dropdown
  const acqMateriale = document.getElementById("acqMateriale");
  acqMateriale.innerHTML = "";
  Object.keys(globalMateriali).forEach((mat) => {
    const opt = document.createElement("option");
    opt.value = mat;
    opt.textContent = `${mat} (${globalMateriali[mat]} mo)`;
    acqMateriale.appendChild(opt);
  });

  // Render inventory
  const magazzinoBody = document.getElementById("magazzinoBody");
  magazzinoBody.innerHTML = "";
  let totalValue = 0;
  Object.entries(globalState.materiali).forEach(([mat, qty]) => {
    const prezzo = globalMateriali[mat] || 0;
    const valore = prezzo * qty;
    totalValue += valore;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${mat}</td>
      <td>${prezzo}</td>
      <td>${qty}</td>
      <td>${valore}</td>
      <td><button class="btn btn-sm btn-outline" data-remove-material="${mat}">Rimuovi</button></td>
    `;
    magazzinoBody.appendChild(row);
  });
  document.getElementById("chipValoreMagazzino").textContent = `${totalValue} mo`;
}

function renderRotte() {
  const rotteBody = document.getElementById("rotteBody");
  rotteBody.innerHTML = "";

  let kmTotali = 0;
  let costoMensile = 0;

  globalState.rotte.forEach((rotta) => {
    kmTotali += rotta.distanza;
    const costoRotta = Math.ceil((rotta.distanza / 100) * 5);
    costoMensile += costoRotta;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rotta.nome}</td>
      <td>${rotta.distanza} km</td>
      <td>${rotta.avampostoUid ? "Coperta" : "Scoperta"}</td>
      <td>${rotta.carico?.materiale || "—"}</td>
      <td>${costoRotta} mo</td>
      <td>
        <span class="badge-risk-${getRischioBadge(rotta.distanza)}">
          ${calculateRischio(rotta.distanza, rotta.avampostoUid)}%
        </span>
      </td>
      <td><button class="btn btn-sm btn-danger" data-remove-rotta="${rotta.uid}">Rimuovi</button></td>
    `;
    rotteBody.appendChild(row);
  });

  document.getElementById("chipKmTotali").textContent = `${kmTotali} km`;
  document.getElementById("chipCostoRotte").textContent = `${costoMensile} mo`;

  if (kmTotali > 400) {
    document.getElementById("rotteWarning").style.display = "block";
  } else {
    document.getElementById("rotteWarning").style.display = "none";
  }
}

function renderFinanze() {
  // Calculate costs
  let costi_fissi = globalState.lavoratori * 1; // 1 mo per lavoratore
  
  let costi_variabili = 0;
  globalState.rotte.forEach((r) => {
    costi_variabili += Math.ceil((r.distanza / 100) * 5);
  });

  const costi_totali = costi_fissi + costi_variabili;
  const disponibile = globalState.oro - globalState.riservaBancaria;

  document.getElementById("chipCostiFissi").textContent = `${costi_fissi} mo`;
  document.getElementById("chipCostiVariabili").textContent = `${costi_variabili} mo`;
  document.getElementById("chipCostiTotali").textContent = `${costi_totali} mo`;
  document.getElementById("chipOroDisponibile").textContent = `${disponibile} mo`;
  document.getElementById("chipRiservaAttuale").textContent = `${globalState.riservaBancaria} mo`;

  // Populate tables
  const costiFissiBody = document.getElementById("costiFissiBody");
  costiFissiBody.innerHTML = `
    <tr>
      <td>Stipendi lavoratori</td>
      <td>${globalState.lavoratori} lavoratori × 1 mo</td>
      <td>${costi_fissi} mo</td>
    </tr>
  `;

  const costiVariabiliBody = document.getElementById("costiVariabiliBody");
  costiVariabiliBody.innerHTML = `
    <tr>
      <td>Rotte commerciali</td>
      <td>${globalState.rotte.length} rotte</td>
      <td>${costi_variabili} mo</td>
    </tr>
  `;

  // Storico movimenti
  const movimentiBody = document.getElementById("movimentiBody");
  movimentiBody.innerHTML = "";
  globalState.movimenti.forEach((m) => {
    const row = document.createElement("tr");
    const importoClass = m.importo > 0 ? "amount-pos" : "amount-neg";
    row.innerHTML = `
      <td>${m.data}</td>
      <td>${m.label}</td>
      <td class="${importoClass}">${m.importo > 0 ? "+" : ""}${m.importo}</td>
      <td>${m.saldoDopo}</td>
    `;
    movimentiBody.appendChild(row);
  });
}

function setupSidebar() {
  // Export button
  document.getElementById("exportBtn")?.addEventListener("click", () => {
    const json = JSON.stringify(globalState, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qg_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import button
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async (e) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const imported = JSON.parse(text);
        Object.assign(globalState, imported);
        await saveState(globalState);
        renderAll();
        showToast("✓ Backup importato con successo");
      } catch (err) {
        showToast("✗ Errore durante l'importazione: " + err.message, 3000);
      }
    });
  }

  // Reset button
  document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (confirm("Sei sicuro? Questa azione non può essere annullata.")) {
      Object.keys(globalState).forEach((k) => {
        if (Array.isArray(globalState[k])) {
          globalState[k] = [];
        } else if (typeof globalState[k] === "number") {
          globalState[k] = 0;
        } else if (typeof globalState[k] === "object") {
          globalState[k] = {};
        } else if (typeof globalState[k] === "string") {
          globalState[k] = "";
        }
      });
      globalState.nome = "Il mio Quartier Generale";
      globalState.classe = "Nessuna";
      globalState.livello = 1;
      saveState(globalState);
      renderAll();
      showToast("✓ Registro azzerato");
    }
  });

  // Copy summary button
  document.getElementById("copySummaryBtn")?.addEventListener("click", () => {
    const summary = `
QG: ${globalState.nome}
Classe: ${globalState.classe}
Livello: ${globalState.livello}
Oro: ${globalState.oro} mo
Strutture: ${globalState.strutture.length}
Lavoratori: ${globalState.lavoratori}
    `.trim();
    navigator.clipboard.writeText(summary).then(() => {
      showToast("✓ Riepilogo copiato");
    });
  });
}

function setupForms() {
  // QG data
  document.getElementById("inNome")?.addEventListener("change", (e) => {
    globalState.nome = e.target.value;
    scheduleAutoSave(globalState);
  });

  document.getElementById("inFondatore")?.addEventListener("change", (e) => {
    globalState.fondatore = e.target.value;
    scheduleAutoSave(globalState);
  });

  document.getElementById("inCofondatore")?.addEventListener("change", (e) => {
    globalState.cofondatore = e.target.value;
    scheduleAutoSave(globalState);
  });

  document.getElementById("inOro")?.addEventListener("change", (e) => {
    globalState.oro = parseInt(e.target.value) || 0;
    scheduleAutoSave(globalState);
    renderPanoramica();
  });

  // Members
  document.getElementById("btnAddMembro")?.addEventListener("click", () => {
    const nome = document.getElementById("inMembroNome")?.value;
    const livello = parseInt(document.getElementById("inMembroLivello")?.value) || 1;
    if (nome) {
      globalState.membri.push({ uid: Date.now().toString(36), nome, livello });
      document.getElementById("inMembroNome").value = "";
      document.getElementById("inMembroLivello").value = "";
      scheduleAutoSave(globalState);
      renderPanoramica();
    }
  });

  // Material acquisition
  document.getElementById("btnAcquista")?.addEventListener("click", () => {
    const materiale = document.getElementById("acqMateriale")?.value;
    const quantita = parseInt(document.getElementById("acqQuantita")?.value) || 1;
    const provenienza = document.getElementById("acqProvenienza")?.value;

    if (!materiale) return;

    const prezzoBase = globalMateriali[materiale] || 0;
    let prezzoFinal = prezzoBase;

    if (provenienza === "qg20") {
      prezzoFinal = prezzoBase * 0.8;
    } else if (provenienza === "mag30") {
      prezzoFinal = prezzoBase * 0.7;
    }

    const costoTotale = Math.floor(prezzoFinal * quantita);
    if (globalState.oro < costoTotale) {
      showToast("✗ Oro insufficiente", 2000);
      return;
    }

    globalState.oro -= costoTotale;
    globalState.materiali[materiale] = (globalState.materiali[materiale] || 0) + quantita;
    globalState.movimenti.push({
      data: new Date().toLocaleDateString("it-IT"),
      label: `Acquisto ${quantita} ${materiale}`,
      importo: -costoTotale,
      saldoDopo: globalState.oro
    });

    scheduleAutoSave(globalState);
    renderMagazzino();
    renderPanoramica();
    showToast(`✓ Acquistato ${quantita} ${materiale}`);
  });

  // Routes
  document.getElementById("btnAddRotta")?.addEventListener("click", () => {
    const nome = document.getElementById("rNome")?.value;
    const distanza = parseInt(document.getElementById("rDistanza")?.value) || 0;

    if (!nome || distanza <= 0) {
      showToast("✗ Dati rotta incompleti", 2000);
      return;
    }

    globalState.rotte.push({
      uid: Date.now().toString(36),
      nome,
      distanza,
      avampostoUid: null,
      carico: null
    });

    document.getElementById("rNome").value = "";
    document.getElementById("rDistanza").value = "";
    scheduleAutoSave(globalState);
    renderRotte();
    showToast("✓ Rotta aggiunta");
  });

  // Workers
  document.getElementById("btnAdeguaLavoratori")?.addEventListener("click", () => {
    let richiesti = 0;
    globalState.strutture.forEach((s) => {
      const struct = globalCatalogo.find((c) => c.id === s.catId);
      if (struct) richiesti += struct.personale || 0;
    });
    globalState.lavoratori = richiesti;
    scheduleAutoSave(globalState);
    renderMagazzino();
    showToast(`✓ Lavoratori impostati a ${richiesti}`);
  });

  // Build structures
  document.addEventListener("click", (e) => {
    if (e.target.dataset.buildStruct) {
      const structId = e.target.dataset.buildStruct;
      const struct = globalCatalogo.find((c) => c.id === structId);
      if (!struct) return;

      if (globalState.oro < struct.costo) {
        showToast("✗ Oro insufficiente", 2000);
        return;
      }

      globalState.oro -= struct.costo;
      const existing = globalState.strutture.find((s) => s.catId === structId);
      if (existing) {
        existing.livello = Math.min(existing.livello + 1, 6);
      } else {
        globalState.strutture.push({
          uid: Date.now().toString(36),
          catId: structId,
          livello: 1
        });
      }

      scheduleAutoSave(globalState);
      renderStrutture();
      renderPanoramica();
      showToast(`✓ ${struct.nome} costruita`);
    }

    if (e.target.dataset.removeStruct) {
      const uid = e.target.dataset.removeStruct;
      globalState.strutture = globalState.strutture.filter((s) => s.uid !== uid);
      scheduleAutoSave(globalState);
      renderStrutture();
      renderPanoramica();
      showToast("✓ Struttura smantellata");
    }

    if (e.target.dataset.removeMembro) {
      const uid = e.target.dataset.removeMembro;
      globalState.membri = globalState.membri.filter((m) => m.uid !== uid);
      scheduleAutoSave(globalState);
      renderPanoramica();
      showToast("✓ Membro rimosso");
    }

    if (e.target.dataset.removeRotta) {
      const uid = e.target.dataset.removeRotta;
      globalState.rotte = globalState.rotte.filter((r) => r.uid !== uid);
      scheduleAutoSave(globalState);
      renderRotte();
      showToast("✓ Rotta rimossa");
    }

    if (e.target.dataset.removeMaterial) {
      const mat = e.target.dataset.removeMaterial;
      delete globalState.materiali[mat];
      scheduleAutoSave(globalState);
      renderMagazzino();
      showToast("✓ Materiale rimosso");
    }
  });
}

export function renderAll(stateOverride = null) {
  if (stateOverride) globalState = stateOverride;
  switchTab(globalState.currentTab || "panoramica");
}

function calculateRischio(distanza, coperta) {
  if (coperta) return 5;
  return Math.min(5 + Math.floor((distanza / 100) * 5), 100);
}

function getRischioBadge(distanza) {
  const rischio = calculateRischio(distanza, false);
  if (rischio <= 15) return "low";
  if (rischio <= 30) return "mid";
  return "high";
}

function showToast(message, duration = 2000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

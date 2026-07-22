import { state, COSTO_ROTTA_MO_PER_100KM, saveState, CATEGORIE } from './storage.js';
import {
  escapeHtml, fmtMo,
  costiFissiDettaglio, costiVariabiliDettaglio,
  costiFissiMensili, costiVariabiliMensili, costoMensileTotale,
  oroDisponibile, registraMovimento, costoMensileRotte,
  eseguiChiusuraMese, personaleRichiesto,
  uid, calcolaProduzioneMensile
} from './utils.js';
import { showToast } from './modal.js';

let _renderAll;
export function setFinanceRenderCallbacks(renderAllFn) {
  _renderAll = renderAllFn;
}
function renderAll() { if (_renderAll) _renderAll(); }

/* ============================================================
   FINANZE — costi fissi/variabili e storico movimenti
   ============================================================ */
export function renderFinanze() {
  document.getElementById('fin-month').textContent = `Mese ${state.calendario.mese}`;
  document.getElementById('fin-season').value = state.calendario.stagione;

  if (state.resocontoUltimoMese) {
    document.getElementById('fin-report-box').style.display = 'block';
    document.getElementById('fin-report-text').textContent = state.resocontoUltimoMese;
  }

  const fissi = costiFissiDettaglio();
  const variabili = costiVariabiliDettaglio();
  const totFissi = costiFissiMensili();
  const totVariabili = costiVariabiliMensili();
  const totale = totFissi + totVariabili;

  const fBody = document.getElementById('fin-fixed-body');
  fBody.innerHTML = '';
  fissi.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(r.voce)}</td><td class="mono">${escapeHtml(r.base)}</td><td class="mono">${fmtMo(r.importo)} mo</td>`;
    fBody.appendChild(tr);
  });

  const vBody = document.getElementById('fin-variable-body');
  vBody.innerHTML = '';
  variabili.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(r.voce)}</td><td class="mono">${escapeHtml(r.base)}</td><td class="mono">${fmtMo(r.importo)} mo</td>`;
    vBody.appendChild(tr);
  });

  document.getElementById('fin-cost-fixed').textContent = fmtMo(totFissi) + ' mo';
  document.getElementById('fin-cost-variable').textContent = fmtMo(totVariabili) + ' mo';
  document.getElementById('fin-cost-total').textContent = fmtMo(totale) + ' mo';
  document.getElementById('fin-available').textContent = fmtMo(oroDisponibile()) + ' mo';

  document.getElementById('fin-reserve').value = state.riservaBancaria || 0;
  document.getElementById('fin-reserve-current').textContent = fmtMo(state.riservaBancaria || 0) + ' mo';

  const saldoDopo = state.oro - totale;
  const chipSaldo = document.getElementById('fin-after-close');
  chipSaldo.textContent = fmtMo(saldoDopo) + ' mo';
  chipSaldo.className = 'v mono ' + (saldoDopo < 0 ? 'amount-neg' : '');
  const avviso = document.getElementById('fin-close-warning');
  if (saldoDopo < 0) {
    avviso.style.display = 'block';
    avviso.textContent = '⚠ La tesoreria andrà in negativo dopo la chiusura di questo mese.';
  } else if (saldoDopo < (state.riservaBancaria || 0)) {
    avviso.style.display = 'block';
    avviso.textContent = `⚠ Dopo la chiusura la tesoreria (${fmtMo(saldoDopo)} mo) scenderà sotto la riserva bancaria fissata (${fmtMo(state.riservaBancaria)} mo).`;
  } else {
    avviso.style.display = 'none';
  }

  const mBody = document.getElementById('fin-movements-body');
  const mEmpty = document.getElementById('fin-movements-empty');
  mBody.innerHTML = '';
  if (!state.movimenti || state.movimenti.length === 0) {
    mEmpty.style.display = 'block';
  } else {
    mEmpty.style.display = 'none';
    state.movimenti.forEach(m => {
      const tr = document.createElement('tr');
      const cls = m.importo >= 0 ? 'amount-pos' : 'amount-neg';
      const segno = m.importo >= 0 ? '+' : '';
      tr.innerHTML = `<td class="mono">${escapeHtml(m.data)}</td><td>${escapeHtml(m.label)}</td><td class="mono ${cls}">${segno}${fmtMo(m.importo)} mo</td><td class="mono">${fmtMo(m.saldoDopo)} mo</td>`;
      mBody.appendChild(tr);
    });
  }

  const aBody = document.getElementById('fin-altriqg-body');
  const aEmpty = document.getElementById('fin-altriqg-empty');
  const aRiepilogo = document.getElementById('fin-altriqg-summary');
  aBody.innerHTML = '';
  const registro = state.registroAltriQG || [];
  if (registro.length === 0) {
    aEmpty.style.display = 'block';
    aRiepilogo.innerHTML = '';
  } else {
    aEmpty.style.display = 'none';
    const ETICHETTE_TIPO = {
      da_ricevere: 'Da ricevere',
      da_dare: 'Da dare',
      entrata: 'Entrata',
      uscita: 'Uscita'
    };
    registro.forEach(v => {
      const tr = document.createElement('tr');
      const tipoLabel = ETICHETTE_TIPO[v.tipo] || v.tipo;
      const positivo = v.tipo === 'da_ricevere' || v.tipo === 'entrata';
      const tipoCls = positivo ? 'amount-pos' : 'amount-neg';
      const azioni = (!v.saldato && (v.tipo === 'da_ricevere' || v.tipo === 'da_dare')) ?
        `<button class="btn btn-brass btn-sm" data-action="salda-altriqg" data-uid="${v.uid}">Salda</button>` : '';
      const stato = v.saldato ? (v.tipo === 'entrata' || v.tipo === 'uscita' ? '✓ Registrato' : '✓ Saldato') : 'Aperto';
      tr.innerHTML = `<td>${escapeHtml(v.nome)}</td><td class="${tipoCls}">${tipoLabel}</td><td class="mono">${fmtMo(v.importo)} mo</td><td>${escapeHtml(v.nota || '')}</td><td>${stato}</td><td style="white-space:nowrap;">${azioni} <button class="btn btn-danger btn-sm" data-action="rimuovi-altriqg" data-uid="${v.uid}">Rimuovi</button></td>`;
      aBody.appendChild(tr);
    });

    const perQg = {};
    registro.forEach(v => {
      if (!perQg[v.nome]) perQg[v.nome] = { scambiato: 0, aperto: 0 };
      const segno = (v.tipo === 'da_ricevere' || v.tipo === 'entrata') ? 1 : -1;
      if (v.tipo === 'entrata' || v.tipo === 'uscita') {
        perQg[v.nome].scambiato += segno * v.importo;
      } else if (v.saldato) {
        perQg[v.nome].scambiato += segno * v.importo;
      } else {
        perQg[v.nome].aperto += segno * v.importo;
      }
    });
    const righeRiepilogo = Object.entries(perQg).map(([nome, r]) => {
      const clsScambiato = r.scambiato >= 0 ? 'amount-pos' : 'amount-neg';
      const clsAperto = r.aperto >= 0 ? 'amount-pos' : 'amount-neg';
      return `<tr><td>${escapeHtml(nome)}</td><td class="mono ${clsScambiato}">${r.scambiato >= 0 ? '+' : ''}${fmtMo(r.scambiato)} mo</td><td class="mono ${clsAperto}">${r.aperto >= 0 ? '+' : ''}${fmtMo(r.aperto)} mo</td></tr>`;
    }).join('');
    aRiepilogo.innerHTML = `
      <div class="hint" style="margin:0 0 4px;">Riepilogo per QG — "Scambiato" = movimenti già applicati alla tesoreria, "Aperto" = crediti (+) o debiti (−) ancora da saldare.</div>
      <table><thead><tr><th>QG</th><th>Scambiato</th><th>Aperto</th></tr></thead><tbody>${righeRiepilogo}</tbody></table>`;
  }
}

/* ============================================================
   REGISTRO ALTRI QG — movimenti economici verso altri Quartier Generali
   ------------------------------------------------------------
   Non è una meccanica del regolamento: è un promemoria contabile
   richiesto dall'utente. Due modalità:
   - "da_ricevere"/"da_dare": crediti/debiti aperti. Restano in sospeso
     finché non si preme "Salda", che applica l'importo alla tesoreria
     e li segna come chiusi.
   - "entrata"/"uscita": movimenti già avvenuti, applicati subito alla
     tesoreria alla registrazione (richiesto dall'utente per poter
     segnare anche le spese/entrate reali già scambiate coi vari QG,
     non solo i crediti/debiti in sospeso).
   Nessuna voce viene mai rimossa automaticamente, per lasciare una
   traccia storica; il riepilogo per QG in cima alla tabella aggrega
   "scambiato" (movimenti realmente applicati) e "aperto" (sospesi).
   ============================================================ */
export function aggiungiAltriQg(nome, tipo, importo, nota) {
  const nomeOk = (nome || '').trim();
  const imp = Math.max(0, Number(importo) || 0);
  if (!nomeOk) { showToast('Inserisci il nome del QG ⚠'); return; }
  if (imp <= 0) { showToast('Inserisci un importo valido ⚠'); return; }
  const tipiValidi = ['da_ricevere', 'da_dare', 'entrata', 'uscita'];
  if (!tipiValidi.includes(tipo)) tipo = 'da_ricevere';
  const notaOk = (nota || '').trim();

  if (tipo === 'entrata' || tipo === 'uscita') {
    if (tipo === 'uscita' && oroDisponibile() < imp) {
      showToast('Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠');
      return;
    }
    const importoMovimento = tipo === 'entrata' ? imp : -imp;
    registraMovimento(`Registro Altri QG — ${nomeOk} (${tipo === 'entrata' ? 'entrata' : 'uscita'})${notaOk ? ': ' + notaOk : ''}`, importoMovimento);
    state.registroAltriQG.push({ uid: uid(), nome: nomeOk, tipo, importo: imp, nota: notaOk, saldato: true });
    showToast(tipo === 'entrata' ? 'Entrata registrata e applicata alla tesoreria' : 'Uscita registrata e applicata alla tesoreria');
    renderAll();
  } else {
    state.registroAltriQG.push({ uid: uid(), nome: nomeOk, tipo, importo: imp, nota: notaOk, saldato: false });
    showToast('Voce aggiunta al Registro Altri QG');
    renderFinanze();
  }
  saveState();
}

export function saldaAltriQg(uidStr) {
  const v = state.registroAltriQG.find(x => x.uid === uidStr);
  if (!v || v.saldato) return;
  if (v.tipo === 'da_dare' && oroDisponibile() < v.importo) {
    showToast('Oro insufficiente in tesoreria (oltre la riserva bancaria) ⚠');
    return;
  }
  const importoMovimento = v.tipo === 'da_ricevere' ? v.importo : -v.importo;
  registraMovimento(`Registro Altri QG — ${v.nome} (${v.tipo === 'da_ricevere' ? 'ricevuto' : 'pagato'})${v.nota ? ': ' + v.nota : ''}`, importoMovimento);
  v.saldato = true;
  showToast('Voce saldata e applicata alla tesoreria');
  renderAll();
  saveState();
}

export function rimuoviAltriQg(uidStr) {
  state.registroAltriQG = state.registroAltriQG.filter(x => x.uid !== uidStr);
  renderFinanze();
  saveState();
}

export function mostraResocontoMese(righe) {
  const box = document.getElementById('fin-report-box');
  document.getElementById('fin-report-text').textContent = righe.join('\n');
  box.style.display = 'block';
  if (typeof box.scrollIntoView === 'function') {
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function initFinanceEvents() {
  document.getElementById('fin-reserve').addEventListener('change', e => {
    state.riservaBancaria = Math.max(0, Number(e.target.value) || 0);
    renderFinanze();
    saveState();
  });

  document.getElementById('fin-altriqg-add-btn').addEventListener('click', () => {
    const nome = document.getElementById('fin-altriqg-name').value;
    const tipo = document.getElementById('fin-altriqg-type').value;
    const importo = document.getElementById('fin-altriqg-amount').value;
    const nota = document.getElementById('fin-altriqg-note').value;
    aggiungiAltriQg(nome, tipo, importo, nota);
    document.getElementById('fin-altriqg-name').value = '';
    document.getElementById('fin-altriqg-amount').value = '0';
    document.getElementById('fin-altriqg-note').value = '';
  });

  document.getElementById('fin-altriqg-body').addEventListener('click', e => {
    const salda = e.target.closest('[data-action="salda-altriqg"]');
    if (salda) { saldaAltriQg(salda.dataset.uid); return; }
    const rimuovi = e.target.closest('[data-action="rimuovi-altriqg"]');
    if (rimuovi) {
      if (confirm('Rimuovere questa voce dal Registro Altri QG?')) rimuoviAltriQg(rimuovi.dataset.uid);
    }
  });

  document.getElementById('fin-season').addEventListener('change', e => {
    state.calendario.stagione = e.target.value;
    renderAll();
    saveState();
  });

  document.getElementById('fin-close-month-btn').addEventListener('click', () => {
    const anteprima = calcolaProduzioneMensile().length + state.rotte.length + costoMensileTotale();
    if (anteprima <= 0 && state.strutture.length === 0) { showToast('Nessuna struttura o rotta attiva: niente da chiudere'); return; }
    if (!confirm(`Chiudere ${state.calendario.stagione}, mese ${state.calendario.mese}? Verranno applicate produzione, token, rischio rotte e upkeep.`)) return;
    const righe = eseguiChiusuraMese();
    state.resocontoUltimoMese = righe.join('\n');
    renderAll();
    saveState();
    mostraResocontoMese(righe);
  });
}

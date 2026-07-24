import { state, callRenderAll } from '../core/state.js';
import { saveState } from '../core/persistence.js';
import { registraMovimento, oroDisponibile, costiFissiDettaglio, costiVariabiliDettaglio, costiFissiMensili, costiVariabiliMensili, costoMensileTotale } from '../engine/finance.js';
import { eseguiChiusuraMese } from '../engine/closure.js';
import { calcolaProduzioneMensile } from '../engine/production.js';
import { fmtMo, escapeHtml, uid } from '../utils/format.js';
import { showToast } from '../ui/toast.js';

/* ============================================================
   FINANZE — costi unificati, chiusura mese, storico, altri QG
   ============================================================ */
export function renderFinanze() {
  document.getElementById('fin-month').textContent = `Mese ${state.calendario.mese}`;
  document.getElementById('fin-season').value = state.calendario.stagione;

  if (state.resocontoUltimoMese) {
    document.getElementById('fin-report-box').style.display = 'block';
    document.getElementById('fin-report-text').textContent = state.resocontoUltimoMese;
  }

  /* ── Token concime/miniera/pesca ── */
  const tokC = state.token.concime || 0;
  const tokM = state.token.miniera || 0;
  const tokP = state.token.pesca || 0;
  const hasTokens = tokC + tokM + tokP > 0;
  const tokensRow = document.getElementById('fin-tokens-row');
  if (tokensRow) tokensRow.style.display = hasTokens ? 'flex' : 'none';

  const wrapC = document.getElementById('fin-token-concime-wrap');
  if (wrapC) {
    wrapC.style.display = tokC > 0 ? 'block' : 'none';
    document.getElementById('fin-token-concime-count').textContent = tokC;
    const inp = document.getElementById('fin-token-concime-input');
    inp.max = tokC;
    if (Number(inp.value) > tokC) inp.value = tokC;
  }

  const wrapM = document.getElementById('fin-token-miniera-wrap');
  if (wrapM) {
    wrapM.style.display = tokM > 0 ? 'block' : 'none';
    document.getElementById('fin-token-miniera-count').textContent = tokM;
    const inp = document.getElementById('fin-token-miniera-input');
    inp.max = Math.min(tokM, 3);
    if (Number(inp.value) > tokM) inp.value = tokM;
  }

  const wrapP = document.getElementById('fin-token-pesca-wrap');
  if (wrapP) {
    wrapP.style.display = tokP > 0 ? 'block' : 'none';
    document.getElementById('fin-token-pesca-count').textContent = tokP;
    const inp = document.getElementById('fin-token-pesca-input');
    inp.max = Math.min(tokP, 3);
    if (Number(inp.value) > tokP) inp.value = tokP;
  }

  /* ── Riepilogo costi unificato ── */
  const fissi = costiFissiDettaglio();
  const variabili = costiVariabiliDettaglio();
  const totFissi = costiFissiMensili();
  const totVariabili = costiVariabiliMensili();
  const totale = totFissi + totVariabili;

  const cBody = document.getElementById('fin-cost-body');
  cBody.innerHTML = '';
  fissi.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;background:rgba(80,120,180,.12);color:var(--blue-dk);">Fisso</span></td><td>${escapeHtml(r.voce)}</td><td class="mono">${escapeHtml(r.base)}</td><td class="mono" style="text-align:right">${fmtMo(r.importo)} mo</td>`;
    cBody.appendChild(tr);
  });
  variabili.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;background:rgba(160,120,60,.12);color:var(--amber-dk);">Variabile</span></td><td>${escapeHtml(r.voce)}</td><td class="mono">${escapeHtml(r.base)}</td><td class="mono" style="text-align:right">${fmtMo(r.importo)} mo</td>`;
    cBody.appendChild(tr);
  });
  if (fissi.length === 0 && variabili.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" class="empty">Nessun costo attivo</td>`;
    cBody.appendChild(tr);
  }

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
    avviso.textContent = '\u26a0 La tesoreria andr\u00e0 in negativo dopo la chiusura di questo mese.';
  } else if (saldoDopo < (state.riservaBancaria || 0)) {
    avviso.style.display = 'block';
    avviso.textContent = `\u26a0 Dopo la chiusura la tesoreria (${fmtMo(saldoDopo)} mo) scender\u00e0 sotto la riserva bancaria fissata (${fmtMo(state.riservaBancaria)} mo).`;
  } else {
    avviso.style.display = 'none';
  }

  /* ── Storico movimenti ── */
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

  /* ── Registro Altri QG ── */
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
      const stato = v.saldato ? (v.tipo === 'entrata' || v.tipo === 'uscita') ? '\u2713 Registrato' : '\u2713 Saldato' : 'Aperto';
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
      <div class="hint" style="margin:0 0 4px;">Riepilogo per QG — "Scambiato" = movimenti gi\u00e0 applicati alla tesoreria, "Aperto" = crediti (+) o debiti (\u2212) ancora da saldare.</div>
      <table><thead><tr><th>QG</th><th>Scambiato</th><th>Aperto</th></tr></thead><tbody>${righeRiepilogo}</tbody></table>`;
  }
}

/* ============================================================
   REGISTRO ALTRI QG — movimenti economici verso altri QG
   ============================================================ */
export function aggiungiAltriQg(nome, tipo, importo, nota) {
  const nomeOk = (nome || '').trim();
  const imp = Math.max(0, Number(importo) || 0);
  if (!nomeOk) { showToast('Inserisci il nome del QG \u26a0'); return; }
  if (imp <= 0) { showToast('Inserisci un importo valido \u26a0'); return; }
  const tipiValidi = ['da_ricevere', 'da_dare', 'entrata', 'uscita'];
  if (!tipiValidi.includes(tipo)) tipo = 'da_ricevere';
  const notaOk = (nota || '').trim();

  if (tipo === 'entrata' || tipo === 'uscita') {
    if (tipo === 'uscita' && oroDisponibile() < imp) {
      showToast('Oro insufficiente in tesoreria (oltre la riserva bancaria) \u26a0');
      return;
    }
    const importoMovimento = tipo === 'entrata' ? imp : -imp;
    registraMovimento(`Registro Altri QG \u2014 ${nomeOk} (${tipo === 'entrata' ? 'entrata' : 'uscita'})${notaOk ? ': ' + notaOk : ''}`, importoMovimento);
    state.registroAltriQG.push({ uid: uid(), nome: nomeOk, tipo, importo: imp, nota: notaOk, saldato: true });
    showToast(tipo === 'entrata' ? 'Entrata registrata e applicata alla tesoreria' : 'Uscita registrata e applicata alla tesoreria');
    callRenderAll();
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
    showToast('Oro insufficiente in tesoreria (oltre la riserva bancaria) \u26a0');
    return;
  }
  const importoMovimento = v.tipo === 'da_ricevere' ? v.importo : -v.importo;
  registraMovimento(`Registro Altri QG \u2014 ${v.nome} (${v.tipo === 'da_ricevere' ? 'ricevuto' : 'pagato'})${v.nota ? ': ' + v.nota : ''}`, importoMovimento);
  v.saldato = true;
  showToast('Voce saldata e applicata alla tesoreria');
  callRenderAll();
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
    callRenderAll();
    saveState();
  });

  document.getElementById('fin-close-month-btn').addEventListener('click', () => {
    const anteprima = calcolaProduzioneMensile().length + state.rotte.length + costoMensileTotale();
    if (anteprima <= 0 && state.strutture.length === 0) { showToast('Nessuna struttura o rotta attiva: niente da chiudere'); return; }
    if (!confirm(`Chiudere ${state.calendario.stagione}, mese ${state.calendario.mese}? Verranno applicate produzione, token, rischio rotte e upkeep.`)) return;
    const inputConcime = document.getElementById('fin-token-concime-input');
    if (inputConcime) {
      state.tokenConcimeDaSpendere = Math.max(0, Math.min(state.token.concime || 0, Number(inputConcime.value) || 0));
      inputConcime.value = 0;
    }
    const inputMiniera = document.getElementById('fin-token-miniera-input');
    if (inputMiniera) {
      state.tokenMinieraDaSpendere = Math.max(0, Math.min(state.token.miniera || 0, 3, Number(inputMiniera.value) || 0));
      inputMiniera.value = 0;
    }
    const inputPesca = document.getElementById('fin-token-pesca-input');
    if (inputPesca) {
      state.tokenPescaDaSpendere = Math.max(0, Math.min(state.token.pesca || 0, 3, Number(inputPesca.value) || 0));
      inputPesca.value = 0;
    }
    const righe = eseguiChiusuraMese();
    state.resocontoUltimoMese = righe.join('\n');
    callRenderAll();
    saveState();
    mostraResocontoMese(righe);
  });
}

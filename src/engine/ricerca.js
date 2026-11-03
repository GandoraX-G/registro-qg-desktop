/* Indice della ricerca globale (Ctrl+K).

   Modulo puro: riceve i dati già estratti dal registro e restituisce voci e
   risultati. Niente DOM e niente accesso allo stato globale, così la ricerca
   si può verificare su un registro finto, come il resto del motore.

   Ogni voce dice in quale tab vive la cosa trovata: la palette si limita a
   portare l'utente lì. */

/* Minuscolo e senza accenti: "perchè" e "perche" devono trovare la stessa
   cosa, e chi digita in fretta non deve azzeccare i segni diacritici. */
export function normalizza(testo) {
  return String(testo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function voce(tipo, titolo, dettaglio, tab, extra = '', priorita = 0) {
  return {
    tipo,
    titolo,
    dettaglio,
    tab,
    priorita,
    chiave: normalizza([titolo, dettaglio, extra].filter(Boolean).join(' ')),
  };
}

export function costruisciIndice({
  catalogo = [],
  strutture = [],
  materiali = {},
  prezzi = {},
  membri = [],
  movimenti = [],
  rotte = [],
} = {}) {
  const voci = [];
  const catalogoPerId = new Map(catalogo.map(c => [c.id, c]));

  for (const c of catalogo) {
    if (!c || !c.id) continue;
    voci.push(voce(
      'Struttura',
      c.nome || c.id,
      [c.categoria, c.costo != null ? `${c.costo} mo` : ''].filter(Boolean).join(' · '),
      'strutture',
      c.desc || '',
    ));
  }

  for (const s of strutture) {
    if (!s) continue;
    const c = catalogoPerId.get(s.catId);
    voci.push(voce(
      'Posseduta',
      `${c ? c.nome : s.catId} (Lv.${s.livello ?? 1})`,
      c ? c.categoria : '',
      'strutture',
      'posseduta costruita',
    ));
  }

  for (const [nome, quantita] of Object.entries(materiali || {})) {
    if (!nome) continue;
    const prezzo = prezzi && prezzi[nome] != null ? `${prezzi[nome]} mo` : 'fuori listino';
    voci.push(voce('Materiale', nome, `${quantita} in magazzino · ${prezzo}`, 'magazzino'));
  }

  for (const m of membri) {
    if (!m || !m.nome) continue;
    voci.push(voce('Membro', m.nome, `Livello ${m.livello ?? 1}`, 'panoramica', 'personaggio'));
  }

  for (const m of movimenti) {
    if (!m) continue;
    voci.push(voce(
      'Movimento',
      String(m.label || 'Movimento'),
      [m.data, m.importo != null ? `${m.importo} mo` : ''].filter(Boolean).join(' · '),
      'finanze',
    ));
  }

  for (const r of rotte) {
    if (!r || !r.nome) continue;
    voci.push(voce('Rotta', r.nome, `${r.distanza ?? 0} km`, 'rotte'));
  }

  return voci;
}

/* Cerca `termine` tra le voci. Ordine: chi ha il titolo che *inizia* con il
   termine viene prima, poi l'ordine di inserimento (catalogo, possedute,
   magazzino, ...), che è già "dal generale al dettaglio". */
export function cerca(indice = [], termine = '', limite = 10) {
  const t = normalizza(termine);
  if (!t) return [];

  const trovate = [];
  for (const v of indice) {
    const posizione = v.chiave.indexOf(t);
    if (posizione === -1) continue;
    const inTitolo = normalizza(v.titolo).startsWith(t) || normalizza(v.titolo).includes(t);
    trovate.push({ voce: v, punteggio: (inTitolo ? 0 : 1), posizione });
  }

  trovate.sort((a, b) => (a.punteggio - b.punteggio) || (a.posizione - b.posizione));
  return trovate.slice(0, limite).map(t => t.voce);
}

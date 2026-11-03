/* Regole della Sala da Guerra che si possono calcolare senza la scheda
   "Guerra" del regolamento (che non è stata fornita).

   Qui non si inventa nulla di ciò che riguarda battaglie, iniziative o perdite:
   il motore si limita a leggere dal registro quante unità il QG ha davvero a
   disposizione e a riassumere gli obiettivi del piano. Tutto puro, così si
   verifica su uno stato finto. */

/* Unità disponibili: quelle già Allenate al Campo d'Addestramento e quelle
   ancora in addestramento. Un QG può avere più campi: si sommano. */
export function forzeDisponibili(strutture = []) {
  let allenate = 0;
  let inAddestramento = 0;
  const nomi = [];

  for (const s of strutture) {
    if (!s || s.catId !== 'campo_addestramento') continue;
    allenate += Number(s.unitaAllenate) || 0;
    const coda = Array.isArray(s.unitaInAddestramento) ? s.unitaInAddestramento : [];
    inAddestramento += coda.length;
    for (const u of coda) {
      if (u && u.nome) nomi.push(u.nome);
    }
  }

  return { allenate, inAddestramento, nomiInAddestramento: nomi };
}

/* Stato del piano: quanti obiettivi sono chiusi e quanti restano. */
export function riepilogoObiettivi(obiettivi = []) {
  const totale = obiettivi.length;
  const fatti = obiettivi.filter(o => o && o.fatto).length;
  return { totale, fatti, aperti: totale - fatti, completato: totale > 0 && fatti === totale };
}

/* Avanzamento del piano per la card: "2/5" oppure un messaggio quando non ci
   sono obiettivi (non "0/0", che sembra un errore). */
export function etichettaAvanzamento(obiettivi = []) {
  const { totale, fatti } = riepilogoObiettivi(obiettivi);
  return totale === 0 ? 'nessun obiettivo' : `${fatti}/${totale} obiettivi`;
}

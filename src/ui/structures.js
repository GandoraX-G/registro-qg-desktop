/* Tab Strutture — barile.

   Il file era un monolite da 1.252 righe; ora è diviso per responsabilità in
   ./structures/*. Chi importa da qui (app.js) non deve cambiare nulla. */
export { renderCatalogo, renderStrutturePossedute } from './structures/catalog.js';
export { renderSottomeccaniche, renderCardImpresa } from './structures/submechanics.js';
export { renderSatelliti } from './structures/satellites.js';
export { initStructureEvents } from './structures/events.js';

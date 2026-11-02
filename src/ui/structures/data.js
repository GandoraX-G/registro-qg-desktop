/* Costanti condivise della tab Strutture (catalogo satelliti, menu Locanda). */
export const SATELLITE_CATALOG_IDS = ['campo_coltivato', 'miniera', 'pescheria', 'segheria', 'fattoria'];

export const PORTATE_LOCANDA = [
  { id: 'pesce',    nome: 'Pesce',       materiali: 'Pesce',                cottura: 'Media',  effettoPortata: 'Velocità Nuoto 10ft',              durata: '7 giorni',  contorno: 'Pesce',     effettoContorno: 'Respirare sott\'acqua',              spellContorno: true },
  { id: 'carne',    nome: 'Carne',       materiali: 'Carne Animale',        cottura: 'Lenta',  effettoPortata: 'Velocità Movimento 20ft',           durata: '1 giorno',  contorno: 'Carne',     effettoContorno: 'Ingrandire/Ridurre',                  spellContorno: true },
  { id: 'pasta',    nome: 'Pasta',       materiali: 'Beni vegetali, Beni animali', cottura: 'Crudo', effettoPortata: 'Range armi distanza 30ft',    durata: '4 ore',     contorno: 'Pasta',     effettoContorno: 'Eroismo',                             spellContorno: true },
  { id: 'zuppa',    nome: 'Zuppa/Drink', materiali: 'Beni animali, Beni vegetali, Birra, Vino', cottura: 'Flambè', effettoPortata: 'Velocità Planata 30ft (-5ft/giorno)', durata: 'Speciale', contorno: 'Zuppa/Drink', effettoContorno: 'Alterare Se Stesso',       spellContorno: true },
  { id: 'verdure',  nome: 'Verdure',     materiali: 'Beni Vegetali',        cottura: 'Forno',  effettoPortata: 'Scurovisione 5ft',                 durata: '1 mese',    contorno: 'Verdure',   effettoContorno: 'Passo del ragno',                     spellContorno: true },
];

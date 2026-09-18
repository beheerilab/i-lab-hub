export type RuimteplannerRoom = {
  id: string;
  naam: string;
};

/**
 * Een "reservering" is gewoon een boeking uit de bestaande Planning-module
 * (tabel `bookings`) — Ruimteplanner is een andere, frissere weergave op
 * dezelfde data, zodat een ruimte nooit dubbel geboekt kan worden tussen de
 * twee modules. `gastnaam`/`aantalGasten` komen uit de bestaande `docent`/
 * `aantal_leerlingen`-kolommen (die voor een boeking van categorie
 * "bijeenkomst" in Planning al als "Aanvrager"/"Aantal gasten" gelabeld
 * worden).
 */
export type Reservering = {
  id: string;
  labId: string;
  labNaam: string;
  datum: string;
  startTijd: string;
  eindTijd: string;
  gastnaam: string;
  aantalGasten: number;
};

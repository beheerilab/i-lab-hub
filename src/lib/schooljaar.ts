/** Een schooljaar loopt van 1 augustus t/m 31 juli, genoteerd als "2025-2026". */

export function huidigSchooljaar(referentie: Date = new Date()): string {
  const jaar = referentie.getFullYear();
  const maand = referentie.getMonth() + 1; // 1-12
  const startJaar = maand >= 8 ? jaar : jaar - 1;
  return `${startJaar}-${startJaar + 1}`;
}

export function schooljaarBereik(schooljaar: string): { start: string; eind: string } {
  const [startJaarStr] = schooljaar.split("-");
  const startJaar = Number(startJaarStr);
  return {
    start: `${startJaar}-08-01`,
    eind: `${startJaar + 1}-07-31`,
  };
}

export function schooljaarOpties(aantal = 5, referentie: Date = new Date()): string[] {
  const huidig = huidigSchooljaar(referentie);
  const [huidigStartJaar] = huidig.split("-").map(Number);
  return Array.from({ length: aantal }, (_, i) => {
    const startJaar = huidigStartJaar - i;
    return `${startJaar}-${startJaar + 1}`;
  });
}

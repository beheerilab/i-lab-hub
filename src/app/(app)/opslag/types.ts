export type OpslagItem = {
  naam: string;
  merk: string;
  aantal: number;
};

export type OpslagSub = {
  naam: string;
  items: OpslagItem[];
};

export type OpslagHoofdlijn = {
  naam: string;
  subs: OpslagSub[];
};

/** Per vak de volledige inhoud — één rij per vak in `opslag_content.inhoud`. */
export type OpslagContent = Record<string, OpslagHoofdlijn[]>;

export type OpslagZone = {
  naam: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

/**
 * Positie van elk vak op de plattegrond (`/opslag-plattegrond.png`), als
 * percentage van de afbeelding — overgenomen uit de eerste versie die Daan
 * met Claude heeft uitgetekend.
 */
export const OPSLAG_ZONES: OpslagZone[] = [
  { naam: "Kast keuken", xPct: 65.2, yPct: 31.3, wPct: 2.4, hPct: 1.1 },
  { naam: "Kast Watt Rechts", xPct: 55.9, yPct: 30, wPct: 1.8, hPct: 1 },
  { naam: "Kast Watt Links", xPct: 57.4, yPct: 29.8, wPct: 2, hPct: 1.7 },
  { naam: "Opslag lessen rechts", xPct: 65.8, yPct: 39.1, wPct: 6.2, hPct: 2.3 },
  { naam: "Opslag evenementen links", xPct: 66, yPct: 36.9, wPct: 5.9, hPct: 2.2 },
  { naam: "Opslag lab_07", xPct: 32.6, yPct: 52.6, wPct: 3.5, hPct: 3.1 },
  { naam: "Opslag lab_06", xPct: 22.8, yPct: 51.3, wPct: 3, hPct: 2.3 },
  { naam: "Opslag lab_05", xPct: 25.8, yPct: 51.3, wPct: 4.2, hPct: 2.2 },
  { naam: "Schoonmaak kast", xPct: 32.1, yPct: 66.5, wPct: 4.4, hPct: 1.9 },
  { naam: "Buiten opslagruimte binnentuin", xPct: 36.5, yPct: 66.2, wPct: 5.1, hPct: 2.2 },
  { naam: "Opslag lab_01", xPct: 49.8, yPct: 70.3, wPct: 4.2, hPct: 2.7 },
  { naam: "Open opslag bij wasbak", xPct: 17.9, yPct: 73.2, wPct: 4.9, hPct: 2.7 },
  { naam: "Opslag werkhal 03", xPct: 17.9, yPct: 75.9, wPct: 4.8, hPct: 3.5 },
  { naam: "Opslag leskisten", xPct: 22.8, yPct: 75.9, wPct: 2.3, hPct: 3.7 },
  { naam: "Opslag algemeen Auditorium", xPct: 57.2, yPct: 32.5, wPct: 1.7, hPct: 3.5 },
  { naam: "Opslag kasten onder 3D printers", xPct: 37.9, yPct: 70.1, wPct: 4.9, hPct: 6.6 },
];

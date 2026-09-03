import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

export type JaaroverzichtBoeking = {
  vak: string;
  klas_groep: string;
  datum: string;
  aantal_leerlingen: number;
  lab_naam: string;
};

export type Uitsplitsing = { label: string; aantalLessen: number; aantalLeerlingen: number };

export type JaaroverzichtData = {
  totaalLessen: number;
  totaalLeerlingen: number;
  perVak: Uitsplitsing[];
  perKlas: Uitsplitsing[];
  perMaand: Uitsplitsing[];
  perLab: Uitsplitsing[];
};

function groepeer(
  boekingen: JaaroverzichtBoeking[],
  sleutel: (b: JaaroverzichtBoeking) => string,
): Uitsplitsing[] {
  const map = new Map<string, Uitsplitsing>();
  for (const b of boekingen) {
    const label = sleutel(b);
    const bestaand = map.get(label) ?? { label, aantalLessen: 0, aantalLeerlingen: 0 };
    bestaand.aantalLessen += 1;
    bestaand.aantalLeerlingen += b.aantal_leerlingen;
    map.set(label, bestaand);
  }
  return Array.from(map.values()).sort((a, b) => b.aantalLessen - a.aantalLessen);
}

function groepeerPerMaand(boekingen: JaaroverzichtBoeking[]): Uitsplitsing[] {
  const map = new Map<string, Uitsplitsing>();
  for (const b of boekingen) {
    const sleutel = b.datum.slice(0, 7); // yyyy-MM, sorteerbaar
    const bestaand = map.get(sleutel) ?? {
      label: format(parseISO(b.datum), "MMMM yyyy", { locale: nl }),
      aantalLessen: 0,
      aantalLeerlingen: 0,
    };
    bestaand.aantalLessen += 1;
    bestaand.aantalLeerlingen += b.aantal_leerlingen;
    map.set(sleutel, bestaand);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, waarde]) => waarde);
}

export function berekenJaaroverzicht(boekingen: JaaroverzichtBoeking[]): JaaroverzichtData {
  return {
    totaalLessen: boekingen.length,
    totaalLeerlingen: boekingen.reduce((som, b) => som + b.aantal_leerlingen, 0),
    perVak: groepeer(boekingen, (b) => b.vak),
    perKlas: groepeer(boekingen, (b) => b.klas_groep),
    perMaand: groepeerPerMaand(boekingen),
    perLab: groepeer(boekingen, (b) => b.lab_naam),
  };
}

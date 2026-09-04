import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { nl } from "date-fns/locale";

export const AMSTERDAM_TZ = "Europe/Amsterdam";

/**
 * "Vandaag" zoals het in Nederland is, als een gewone lokale Date op
 * middernacht — veilig te gebruiken met date-fns-functies als addDays/
 * startOfWeek/format, ongeacht of de code in UTC (Netlify) of in een andere
 * tijdzone (lokale ontwikkeling) draait. Alleen bedoeld voor
 * kalenderdatum-berekeningen, niet voor exacte tijdstippen.
 */
export function huidigeDatumAmsterdam(): Date {
  const [jaar, maand, dag] = formatInTimeZone(new Date(), AMSTERDAM_TZ, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  return new Date(jaar, maand - 1, dag);
}

/**
 * Formatteert een opgeslagen timestamp in Nederlandse tijd i.p.v. de
 * servertijdzone (UTC), zodat weergegeven tijden kloppen met de klok hier.
 */
export function formatAmsterdam(datum: Date | string, patroon: string): string {
  const d = typeof datum === "string" ? new Date(datum) : datum;
  return formatInTimeZone(d, AMSTERDAM_TZ, patroon, { locale: nl });
}

/**
 * Zet een lokale datum/tijd-string zonder tijdzone (zoals uit een
 * `datetime-local`-invoerveld, bedoeld als Nederlandse tijd) om naar het
 * juiste UTC-tijdstip om op te slaan.
 */
export function amsterdamNaarUtc(lokaleDatumTijd: string): Date {
  return fromZonedTime(lokaleDatumTijd, AMSTERDAM_TZ);
}

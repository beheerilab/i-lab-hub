import { format } from "date-fns";
import { nl } from "date-fns/locale";

export type BoekingEmailDetails = {
  labNaam: string;
  datum: string;
  startTijd: string;
  eindTijd: string;
  vak: string;
  school: string;
  docentNaam: string;
};

function detailsRegel({ labNaam, datum, startTijd, eindTijd, vak, school }: BoekingEmailDetails) {
  const datumLabel = format(new Date(`${datum}T00:00:00`), "d MMMM yyyy", { locale: nl });
  return `
    <p><strong>${vak}</strong> — ${school}</p>
    <p>${datumLabel}, ${startTijd.slice(0, 5)}–${eindTijd.slice(0, 5)} uur, ${labNaam}</p>
  `;
}

export function docentBevestigingHtml(
  actie: "aangemaakt" | "gewijzigd" | "geannuleerd",
  details: BoekingEmailDetails,
) {
  const titel =
    actie === "aangemaakt"
      ? "Je les is ingepland"
      : actie === "gewijzigd"
        ? "Je les is gewijzigd"
        : "Je les is geannuleerd";
  return `<h2>${titel}</h2>${detailsRegel(details)}`;
}

export function crewMeldingHtml(
  actie: "aangemaakt" | "gewijzigd" | "geannuleerd",
  details: BoekingEmailDetails,
) {
  const titel =
    actie === "aangemaakt"
      ? `${details.docentNaam} heeft een les ingepland`
      : actie === "gewijzigd"
        ? `${details.docentNaam} heeft een les gewijzigd`
        : `${details.docentNaam} heeft een les geannuleerd`;
  return `<h2>${titel}</h2>${detailsRegel(details)}`;
}

export function docentHerhalingBevestigingHtml(samenvatting: string) {
  return `<h2>Je lessen zijn ingepland</h2><p>${samenvatting}</p>`;
}

export function crewHerhalingMeldingHtml(docentNaam: string, samenvatting: string) {
  return `<h2>${docentNaam} heeft terugkerende lessen ingepland</h2><p>${samenvatting}</p>`;
}

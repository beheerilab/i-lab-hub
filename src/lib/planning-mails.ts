import { format } from "date-fns";
import { nl } from "date-fns/locale";

export type PlanningMailBoeking = {
  vak: string;
  datum: string;
  start: string;
  eind: string;
  lab: string;
  docent: string;
  school: string;
  reden?: string;
};

type Type = "aanvraag" | "bevestigd" | "afgewezen" | "ingetrokken" | "geannuleerd" | "ingepland" | "verlopen";

const ONDERWERPEN: Record<Type, string> = {
  aanvraag: "nieuwe aanvraag",
  bevestigd: "aanvraag bevestigd",
  afgewezen: "aanvraag afgewezen",
  ingetrokken: "aanvraag ingetrokken",
  geannuleerd: "les geannuleerd",
  ingepland: "les ingepland",
  verlopen: "aanvraag verlopen",
};

const TITELS: Record<Type, string> = {
  aanvraag: "Nieuwe aanvraag in de planning",
  bevestigd: "Je aanvraag is bevestigd",
  afgewezen: "Je aanvraag is afgewezen",
  ingetrokken: "Een aanvraag is ingetrokken",
  geannuleerd: "Een les is geannuleerd",
  ingepland: "Er is een les voor je ingepland",
  verlopen: "Je aanvraag is verlopen",
};

const TOELICHTING: Partial<Record<Type, string>> = {
  aanvraag: "Bevestig of wijs deze aanvraag af in de planning (tab Aanvragen). Het tijdvak is voor de aanvrager gereserveerd.",
  verlopen: "De aanvraag is niet op tijd bevestigd, daarom is het tijdvak weer vrijgegeven. Dien gerust een nieuwe aanvraag in.",
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function planningMail(type: Type, b: PlanningMailBoeking) {
  const datum = format(new Date(`${b.datum}T00:00:00`), "EEEE d MMMM yyyy", { locale: nl });
  const wie = [b.docent, b.school].filter(Boolean).map(esc).join(" · ");
  return `
    <h2>${TITELS[type]}</h2>
    <p><strong>${esc(b.vak)}</strong>${wie ? ` — ${wie}` : ""}</p>
    <p>${esc(datum)}, ${esc(b.start)}–${esc(b.eind)} uur${b.lab ? `, ${esc(b.lab)}` : ""}</p>
    ${type === "afgewezen" && b.reden ? `<p><strong>Reden:</strong> ${esc(b.reden)}</p>` : ""}
    ${TOELICHTING[type] ? `<p>${TOELICHTING[type]}</p>` : ""}
  `;
}
planningMail.onderwerp = (type: Type) => ONDERWERPEN[type];

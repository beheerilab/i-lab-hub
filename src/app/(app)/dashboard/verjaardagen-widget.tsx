import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";

function volgendeVerjaardag(geboortedatum: string, vandaag: Date) {
  const [, maandStr, dagStr] = geboortedatum.split("-");
  const maand = Number(maandStr) - 1;
  const dag = Number(dagStr);
  let volgende = new Date(vandaag.getFullYear(), maand, dag);
  if (differenceInCalendarDays(volgende, vandaag) < 0) {
    volgende = new Date(vandaag.getFullYear() + 1, maand, dag);
  }
  return { datum: volgende, dagenTot: differenceInCalendarDays(volgende, vandaag) };
}

export async function VerjaardagenWidget() {
  const supabase = await createClient();
  const vandaag = huidigeDatumAmsterdam();

  const { data: personen } = await supabase
    .from("contactpersonen")
    .select("id, naam, geboortedatum, afdelingen(contacts(naam))")
    .not("geboortedatum", "is", null);

  const aankomend = (personen ?? [])
    .map((p) => {
      const { datum, dagenTot } = volgendeVerjaardag(p.geboortedatum!, vandaag);
      return {
        id: p.id,
        naam: p.naam,
        bedrijf: p.afdelingen?.contacts?.naam ?? null,
        datum,
        dagenTot,
      };
    })
    .filter((p) => p.dagenTot <= 30)
    .sort((a, b) => a.dagenTot - b.dagenTot)
    .slice(0, 5);

  if (aankomend.length === 0) return null;

  return (
    <Card className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">🎂 Aankomende verjaardagen</h2>
      <ul className="space-y-1.5">
        {aankomend.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              <span className="font-medium">{p.naam}</span>
              {p.bedrijf && <span className="text-muted"> — {p.bedrijf}</span>}
            </span>
            <span className="shrink-0 text-muted">
              {p.dagenTot === 0 ? "vandaag" : format(p.datum, "d MMMM", { locale: nl })}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

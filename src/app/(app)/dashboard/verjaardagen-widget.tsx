import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { UitklapLijst } from "./uitklap-lijst";

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
    .select("id, naam, geboortedatum, afdelingen(contacts(id, naam))")
    .not("geboortedatum", "is", null);

  const aankomend = (personen ?? [])
    .map((p) => {
      const { datum, dagenTot } = volgendeVerjaardag(p.geboortedatum!, vandaag);
      return {
        id: p.id,
        naam: p.naam,
        bedrijf: p.afdelingen?.contacts?.naam ?? null,
        contactId: p.afdelingen?.contacts?.id ?? null,
        datum,
        dagenTot,
      };
    })
    .filter((p) => p.dagenTot <= 30)
    .sort((a, b) => a.dagenTot - b.dagenTot);

  if (aankomend.length === 0) return null;

  return (
    <Card className="mb-6">
      <h2 className="mb-3 text-lg font-semibold">🎂 Aankomende verjaardagen</h2>
      <UitklapLijst
        aantal={5}
        kinderen={aankomend.map((p) => (
          <li key={p.id}>
            <Link
              href={p.contactId ? `/contacten?open=${p.contactId}&q=${encodeURIComponent(p.naam)}` : `/contacten?q=${encodeURIComponent(p.naam)}`}
              className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/[.04]"
            >
              <span>
                <span className="font-medium">{p.naam}</span>
                {p.bedrijf && <span className="text-muted"> — {p.bedrijf}</span>}
              </span>
              <span className="shrink-0 text-muted">
                {p.dagenTot === 0 ? "vandaag" : format(p.datum, "d MMMM", { locale: nl })}
              </span>
            </Link>
          </li>
        ))}
      />
    </Card>
  );
}

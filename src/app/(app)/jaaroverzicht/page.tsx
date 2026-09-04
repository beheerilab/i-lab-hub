import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { huidigSchooljaar, schooljaarBereik, schooljaarOpties } from "@/lib/schooljaar";
import { berekenJaaroverzicht } from "@/lib/jaaroverzicht";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { SchooljaarFilter } from "./schooljaar-filter";
import { BreakdownCard } from "./breakdown-card";

export default async function JaaroverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ schooljaar?: string }>;
}) {
  const { schooljaar: schooljaarParam } = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const schooljaar = schooljaarParam || huidigSchooljaar();
  const { start, eind } = schooljaarBereik(schooljaar);

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("vak, school, datum, aantal_leerlingen, labs(naam)")
    .gte("datum", start)
    .lte("datum", eind);

  const boekingen = (bookingsRaw ?? []).map((b) => ({
    vak: b.vak,
    school: b.school,
    datum: b.datum,
    aantal_leerlingen: b.aantal_leerlingen,
    lab_naam: b.labs?.naam || "onbekend",
  }));

  const data = berekenJaaroverzicht(boekingen);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Jaaroverzicht</h1>
      <p className="mb-6 text-white/80">
        Lessen en leerlingaantallen uit de planning, voor verantwoording aan schoolleiding.
      </p>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <SchooljaarFilter opties={schooljaarOpties()} huidig={schooljaar} />
        <LinkButton href={`/jaaroverzicht/export?schooljaar=${schooljaar}`} variant="secondary">
          Exporteer als Excel
        </LinkButton>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Totaal aantal lessen/activiteiten</p>
          <p className="text-3xl font-semibold">{data.totaalLessen}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Totaal aantal leerlingen</p>
          <p className="text-3xl font-semibold">{data.totaalLeerlingen}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownCard title="Per vak" data={data.perVak} />
        <BreakdownCard title="Per school" data={data.perSchool} />
        <BreakdownCard title="Per maand" data={data.perMaand} />
        <BreakdownCard title="Per lab" data={data.perLab} />
      </div>
    </div>
  );
}

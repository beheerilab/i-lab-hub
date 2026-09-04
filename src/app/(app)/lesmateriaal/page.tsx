import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { SubjectTopicForm } from "./subject-topic-form";
import { MaterialForm } from "./material-form";
import { MaterialFilters } from "./filters";
import { MaterialCard } from "./material-card";

export default async function LesmateriaalPage({
  searchParams,
}: {
  searchParams: Promise<{ vak?: string; onderwerp?: string; q?: string }>;
}) {
  const { vak = "", onderwerp = "", q = "" } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: subjects }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("*").order("naam"),
    supabase.from("topics").select("*").order("naam"),
  ]);

  let materialsQuery = supabase
    .from("materials")
    .select("*, subjects(naam), topics(naam)")
    .order("created_at", { ascending: false });

  if (vak) materialsQuery = materialsQuery.eq("subject_id", vak);
  if (onderwerp) materialsQuery = materialsQuery.eq("topic_id", onderwerp);

  const { data: materialsRaw } = await materialsQuery;

  const zoekterm = q.trim().toLowerCase();
  const materials = (materialsRaw ?? []).filter((m) => {
    if (!zoekterm) return true;
    return (
      m.titel.toLowerCase().includes(zoekterm) ||
      (m.beschrijving ?? "").toLowerCase().includes(zoekterm) ||
      m.tags.some((tag) => tag.toLowerCase().includes(zoekterm))
    );
  });

  const fileUrls = new Map<string, string>();
  for (const m of materials) {
    if (m.file_path) {
      const { data } = supabase.storage.from("materials").getPublicUrl(m.file_path);
      fileUrls.set(m.id, data.publicUrl);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Lesmateriaal</h1>
      <p className="mb-6 text-white/80">Lesstof, gesorteerd per vak en onderwerp.</p>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Vakken &amp; onderwerpen</h2>
        <SubjectTopicForm subjects={subjects ?? []} />
      </Card>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Materiaal toevoegen</h2>
        <MaterialForm subjects={subjects ?? []} topics={topics ?? []} />
      </Card>

      <MaterialFilters
        subjects={subjects ?? []}
        topics={topics ?? []}
        huidigVak={vak}
        huidigOnderwerp={onderwerp}
        huidigZoek={q}
      />

      {materials.length === 0 ? (
        <Card>
          <p className="text-muted">Geen materiaal gevonden.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {materials.map((m) => (
            <MaterialCard
              key={m.id}
              id={m.id}
              titel={m.titel}
              beschrijving={m.beschrijving}
              vakNaam={m.subjects?.naam || "onbekend"}
              onderwerpNaam={m.topics?.naam || "onbekend"}
              tags={m.tags}
              link={m.link}
              fileUrl={fileUrls.get(m.id) ?? null}
              magVerwijderen={profile.role === "admin" || m.created_by === userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

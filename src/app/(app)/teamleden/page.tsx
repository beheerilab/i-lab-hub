import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MemberRow } from "./member-row";

export default async function TeamledenPage() {
  const { userId } = await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .order("full_name");

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Teamleden</h1>
      <p className="mb-6 text-white/80">
        Beheer wie toegang heeft tot i-lab Hub en wie beheerder is.
      </p>
      <Card>
        {!profiles || profiles.length === 0 ? (
          <p className="text-muted">Nog geen teamleden.</p>
        ) : (
          <ul>
            {profiles.map((p) => (
              <MemberRow
                key={p.id}
                id={p.id}
                naam={p.full_name || "Naamloos"}
                rol={p.role}
                isJezelf={p.id === userId}
              />
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-sm text-white/70">
        &ldquo;Toegang intrekken&rdquo; verwijdert het profiel uit i-lab Hub. Het bijbehorende account in
        Supabase blijft daarna nog bestaan (te verwijderen via Supabase → Authentication).
      </p>
    </div>
  );
}

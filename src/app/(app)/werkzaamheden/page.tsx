import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadWerkzaamheden } from "@/lib/werkzaamheden";
import { WerkzaamhedenApp } from "./werkzaamheden-app";

export default async function WerkzaamhedenPage() {
  const { userId, profile, email } = await requireGeenDocent();
  const supabase = await createClient();
  const data = await laadWerkzaamheden(supabase, {
    id: userId,
    naam: profile.full_name || email || "collega",
    rol: profile.role === "admin" ? "beheerder" : "collega",
  });

  return (
    <>
      <h1 className="sr-only">Werkzaamheden</h1>
      <WerkzaamhedenApp initial={data} />
    </>
  );
}

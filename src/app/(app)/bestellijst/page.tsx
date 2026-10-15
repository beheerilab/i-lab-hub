import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadBestellijst } from "@/lib/bestellijst";
import { BestellijstApp } from "./bestellijst-app";

export default async function BestellijstPage() {
  const { profile, email } = await requireGeenDocent();
  const supabase = await createClient();
  const data = await laadBestellijst(supabase);

  return (
    <>
      <h1 className="sr-only">Bestellijst</h1>
      <BestellijstApp
        initial={{
          ...data,
          me: {
            naam: profile.full_name || email || "collega",
            rol: profile.role === "admin" ? "beheerder" : "collega",
          },
        }}
      />
    </>
  );
}

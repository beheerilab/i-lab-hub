import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { laadPlanning } from "@/lib/planning";
import { PlanningApp } from "./planning-app";

export default async function PlanningPage() {
  const { userId, profile, email } = await requireProfile();
  const supabase = await createClient();
  const data = await laadPlanning(supabase, {
    id: userId,
    naam: profile.full_name || email || "collega",
    crew: profile.role === "admin" || profile.role === "lid",
  });

  return (
    <>
      <h1 className="sr-only">Planning</h1>
      <PlanningApp initial={data} />
    </>
  );
}

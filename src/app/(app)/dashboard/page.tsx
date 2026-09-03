import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClaimAdminBanner } from "./claim-admin-banner";

const MODULES = [
  {
    href: "/bestellijst",
    icon: "📦",
    title: "Bestellijst",
    description: "Materiaal aanvragen en bestelhistorie bekijken",
  },
  {
    href: "/lesmateriaal",
    icon: "📚",
    title: "Lesmateriaal",
    description: "Lesstof per vak en onderwerp",
  },
  {
    href: "/taken",
    icon: "✅",
    title: "Taken",
    description: "Openstaande en afgevinkte taken per week",
  },
  {
    href: "/planning",
    icon: "🗓️",
    title: "Planning",
    description: "Labgebruik per week inplannen",
  },
  {
    href: "/jaaroverzicht",
    icon: "📊",
    title: "Jaaroverzicht",
    description: "Lessen en leerlingaantallen, te exporteren",
  },
  {
    href: "/handleidingen",
    icon: "🛠️",
    title: "Handleidingen",
    description: "Instructies voor apparatuur in het lab",
  },
];

export default async function DashboardPage() {
  const { profile } = await requireProfile();

  let showClaimAdminBanner = false;
  if (profile.role !== "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    showClaimAdminBanner = (count ?? 0) === 0;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">
        Welkom, {profile.full_name || "collega"}
      </h1>
      <p className="mb-6 text-muted">Kies een onderdeel om mee aan de slag te gaan.</p>

      {showClaimAdminBanner && <ClaimAdminBanner />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
          >
            <div className="mb-3 text-3xl">{mod.icon}</div>
            <div className="mb-1 text-lg font-semibold">{mod.title}</div>
            <div className="text-sm text-muted">{mod.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

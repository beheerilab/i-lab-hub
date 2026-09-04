import Link from "next/link";

export function BestellijstTabs({ active }: { active: "nieuw" | "actief" | "historie" }) {
  const tabClasses = (isActive: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-accent text-white" : "text-muted hover:bg-black/[.03]"
    }`;

  return (
    <div className="mb-6 inline-flex gap-1 rounded-xl border border-border bg-white p-1">
      <Link href="/bestellijst/nieuw" className={tabClasses(active === "nieuw")}>
        Nieuw
      </Link>
      <Link href="/bestellijst" className={tabClasses(active === "actief")}>
        Actieve lijst
      </Link>
      <Link href="/bestellijst/historie" className={tabClasses(active === "historie")}>
        Historie
      </Link>
    </div>
  );
}

export const MODULES = [
  {
    href: "/planning",
    icon: "🗓️",
    title: "Planning",
    description: "Ruimtegebruik inplannen",
  },
  {
    href: "/werkzaamheden",
    icon: "✅",
    title: "Werkzaamheden",
    description: "Openstaande en afgevinkte werkzaamheden per week",
  },
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
  {
    href: "/contacten",
    icon: "📇",
    title: "Contacten",
    description: "Leveranciers en wie je waarvoor kunt bellen",
  },
  {
    href: "/sleutels",
    icon: "🔑",
    title: "Sleuteloverzicht",
    description: "Wie welke sleutel en tag heeft",
  },
  {
    href: "/opslag",
    icon: "🗄️",
    title: "Opslagoverzicht",
    description: "Plattegrond met wat waar ligt opgeslagen",
  },
] as const;

/**
 * Een docent mag alleen bij Planning en de leesbare documentatie (Lesmateriaal/
 * Handleidingen) — de rest (Werkzaamheden, Bestellijst, Jaaroverzicht, Contacten,
 * Sleuteloverzicht) is crew-only. Gebruikt door de navigatie/dashboard-tegels
 * én als paginabeveiliging (zie requireGeenDocent in lib/auth.ts).
 */
export const DOCENT_TOEGANKELIJKE_HREFS: string[] = ["/planning", "/lesmateriaal", "/handleidingen"];

export function modulesVoorRol<T extends { href: string }>(rol: string, modules: readonly T[]): T[] {
  if (rol !== "docent") return [...modules];
  return modules.filter((mod) => DOCENT_TOEGANKELIJKE_HREFS.includes(mod.href));
}

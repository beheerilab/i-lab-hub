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
  {
    href: "/storingen",
    icon: "🚨",
    title: "Storingen",
    description: "Gemelde storingen, machines en QR-labels",
  },
  {
    href: "/prijscalculator",
    icon: "🧮",
    title: "Prijscalculator",
    description: "Offertes voor lessen en ruimteverhuur",
  },
  {
    href: "/facturatie",
    icon: "🧾",
    title: "Ruimtegebruik facturatie",
    description: "Reserveringen inlezen en facturen maken",
  },
  {
    href: "/reiskosten",
    icon: "🚗",
    title: "Reiskosten",
    description: "Woon-werk kilometers per maand, als PDF",
  },
] as const;

/** Modules die in de navigatiebalk onder het menu "Tools" vallen. */
export const TOOLS_HREFS: string[] = ["/prijscalculator", "/facturatie", "/reiskosten"];

/**
 * Een docent mag alleen bij Planning en de leesbare documentatie (Lesmateriaal/
 * Handleidingen) — de rest (Werkzaamheden, Bestellijst, Jaaroverzicht, Contacten,
 * Sleuteloverzicht) is crew-only. Gebruikt door de navigatie/dashboard-tegels
 * én als paginabeveiliging (zie requireGeenDocent in lib/auth.ts).
 */
export const DOCENT_TOEGANKELIJKE_HREFS: string[] = ["/planning", "/lesmateriaal", "/handleidingen"];

/** Modules die alleen de beheerder ziet. */
export const ADMIN_ALLEEN_HREFS: string[] = ["/storingen"];

export function modulesVoorRol<T extends { href: string }>(rol: string, modules: readonly T[]): T[] {
  const zichtbaar = rol === "admin" ? [...modules] : modules.filter((mod) => !ADMIN_ALLEEN_HREFS.includes(mod.href));
  if (rol !== "docent") return zichtbaar;
  return zichtbaar.filter((mod) => DOCENT_TOEGANKELIJKE_HREFS.includes(mod.href));
}

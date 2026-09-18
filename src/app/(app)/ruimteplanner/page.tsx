import { redirect } from "next/navigation";

/**
 * Ruimteplanner is samengevoegd met Planning (zelfde ruimtes/boekingen,
 * altijd al gedeelde data) — deze route blijft als redirect staan voor wie
 * de oude link nog open heeft.
 */
export default function RuimteplannerRedirectPage() {
  redirect("/planning");
}

"use server";

import { revalidatePath } from "next/cache";
import { addDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { huidigeDatumAmsterdam } from "@/lib/tijd";
import { stuurEmail } from "@/lib/email";
import {
  docentBevestigingHtml,
  crewMeldingHtml,
  docentHerhalingBevestigingHtml,
  crewHerhalingMeldingHtml,
  type BoekingEmailDetails,
} from "./booking-emails";
import type { ActiviteitType, BoekingCategorie } from "@/lib/supabase/database.types";

async function verstuurBoekingMailsAlsDocent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userEmail: string | null | undefined,
  actie: "aangemaakt" | "gewijzigd" | "geannuleerd",
  details: BoekingEmailDetails,
) {
  const { data: crewAdressen } = await supabase.rpc("crew_emails");

  await Promise.all([
    userEmail
      ? stuurEmail({
          aan: userEmail,
          onderwerp: `i-lab: ${details.vak} — ${actie}`,
          html: docentBevestigingHtml(actie, details),
        })
      : Promise.resolve(),
    crewAdressen && crewAdressen.length > 0
      ? stuurEmail({
          aan: crewAdressen,
          onderwerp: `i-lab: les ${actie} door ${details.docentNaam}`,
          html: crewMeldingHtml(actie, details),
        })
      : Promise.resolve(),
  ]);
}

export type ActionState = { error?: string; summary?: string };

const GELDIGE_ACTIVITEITEN: ActiviteitType[] = [
  "les",
  "project",
  "vrij_gebruik",
  "extern_bezoek",
  "evenement",
  "vergadering",
  "anders",
];

export async function saveBookingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const labId = String(formData.get("lab_id") ?? "");
  const datum = String(formData.get("datum") ?? "");
  const startTijd = String(formData.get("start_tijd") ?? "");
  const eindTijd = String(formData.get("eind_tijd") ?? "");
  const categorie = String(formData.get("categorie") ?? "les") as BoekingCategorie;
  const vak = String(formData.get("vak") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const docent = String(formData.get("docent") ?? "").trim();
  const typeActiviteit = String(formData.get("type_activiteit") ?? "") as ActiviteitType;
  const typeActiviteitAnders = String(formData.get("type_activiteit_anders") ?? "").trim();
  const aantalLeerlingen = Number(formData.get("aantal_leerlingen"));
  const bijzonderheden = String(formData.get("bijzonderheden") ?? "").trim();
  const herhaalTot = String(formData.get("herhaal_tot") ?? "").trim();

  if (!labId || !datum) return { error: "Ongeldige ruimte of datum." };
  if (!startTijd || !eindTijd) return { error: "Vul een begin- en eindtijd in." };
  if (startTijd >= eindTijd) return { error: "Eindtijd moet na begintijd liggen." };
  if (categorie !== "les" && categorie !== "bijeenkomst") {
    return { error: "Kies een geldige boekingscategorie." };
  }
  if (!vak) return { error: categorie === "les" ? "Kies een vak/les." : "Vul een onderwerp in." };
  if (!school) return { error: categorie === "les" ? "Vul de school in." : "Vul de organisatie in." };
  if (!docent) {
    return { error: categorie === "les" ? "Vul de docent in." : "Vul de aanvrager in." };
  }
  if (!GELDIGE_ACTIVITEITEN.includes(typeActiviteit)) {
    return { error: "Kies een type activiteit." };
  }
  if (typeActiviteit === "anders" && !typeActiviteitAnders) {
    return { error: "Vul in wat voor soort bijeenkomst dit is." };
  }
  if (!Number.isFinite(aantalLeerlingen) || aantalLeerlingen < 0) {
    return {
      error: categorie === "les" ? "Vul een geldig aantal leerlingen in." : "Vul een geldig aantal gasten in.",
    };
  }
  if (herhaalTot && herhaalTot < datum) {
    return { error: "De einddatum van de herhaling moet op of na de startdatum liggen." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { data: lab } = await supabase
    .from("labs")
    .select("naam, docent_boekbaar")
    .eq("id", labId)
    .single();
  const labNaam = lab?.naam ?? "";

  const { data: actorProfiel } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (actorProfiel?.role === "docent" && !lab?.docent_boekbaar) {
    return { error: "Deze ruimte is niet boekbaar voor docenten." };
  }

  const payload = {
    lab_id: labId,
    datum,
    start_tijd: startTijd,
    eind_tijd: eindTijd,
    categorie,
    vak,
    school,
    docent,
    type_activiteit: typeActiviteit,
    type_activiteit_anders: typeActiviteit === "anders" ? typeActiviteitAnders : null,
    aantal_leerlingen: aantalLeerlingen,
    bijzonderheden: bijzonderheden || null,
  };

  if (!id && herhaalTot) {
    const datums: string[] = [];
    for (let d = new Date(`${datum}T00:00:00`); format(d, "yyyy-MM-dd") <= herhaalTot; d = addDays(d, 7)) {
      datums.push(format(d, "yyyy-MM-dd"));
    }

    let gelukt = 0;
    const overgeslagen: string[] = [];
    for (const dt of datums) {
      const { error } = await supabase
        .from("bookings")
        .insert({ ...payload, datum: dt, created_by: user.id });
      if (error) overgeslagen.push(dt);
      else gelukt++;
    }

    const samenvatting =
      overgeslagen.length === 0
        ? `${gelukt} lessen ingepland, elke week t/m ${herhaalTot}.`
        : `${gelukt} van ${datums.length} ingepland. Overgeslagen wegens overlap: ${overgeslagen.join(", ")}.`;

    if (gelukt > 0) {
      if (actorProfiel?.role === "docent") {
        const { data: crewAdressen } = await supabase.rpc("crew_emails");
        await Promise.all([
          user.email
            ? stuurEmail({
                aan: user.email,
                onderwerp: `i-lab: lessen ingepland`,
                html: docentHerhalingBevestigingHtml(samenvatting),
              })
            : Promise.resolve(),
          crewAdressen && crewAdressen.length > 0
            ? stuurEmail({
                aan: crewAdressen,
                onderwerp: `i-lab: terugkerende lessen van ${docent}`,
                html: crewHerhalingMeldingHtml(docent, samenvatting),
              })
            : Promise.resolve(),
        ]);
      }
    }

    revalidatePath("/planning");
    return { summary: samenvatting };
  }

  const { error } = id
    ? await supabase.from("bookings").update(payload).eq("id", id)
    : await supabase.from("bookings").insert({ ...payload, created_by: user.id });

  if (error) {
    if (error.code === "23P01") {
      return { error: "Dit tijdvak overlapt met een bestaande boeking in deze ruimte." };
    }
    return { error: "Opslaan mislukt: " + error.message };
  }

  if (actorProfiel?.role === "docent") {
    await verstuurBoekingMailsAlsDocent(supabase, user.email, id ? "gewijzigd" : "aangemaakt", {
      labNaam,
      datum,
      startTijd,
      eindTijd,
      vak,
      school,
      docentNaam: docent,
    });
  }

  revalidatePath("/planning");
  return {};
}

export async function deleteBookingAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: booking } = await supabase
    .from("bookings")
    .select("datum, start_tijd, eind_tijd, vak, school, docent, labs(naam)")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return;

  if (user && booking) {
    const { data: profiel } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profiel?.role === "docent") {
      await verstuurBoekingMailsAlsDocent(supabase, user.email, "geannuleerd", {
        labNaam: booking.labs?.naam ?? "",
        datum: booking.datum,
        startTijd: booking.start_tijd,
        eindTijd: booking.eind_tijd,
        vak: booking.vak,
        school: booking.school,
        docentNaam: booking.docent,
      });
    }
  }

  revalidatePath("/planning");
}

export type RoomActionState = { error?: string };

export async function createRoomAction(
  _prevState: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const naam = String(formData.get("naam") ?? "").trim();
  if (!naam) return { error: "Vul een naam voor de ruimte in." };

  const supabase = await createClient();
  const { data: bestaande } = await supabase
    .from("labs")
    .select("volgorde")
    .order("volgorde", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("labs").insert({
    naam,
    volgorde: (bestaande?.volgorde ?? 0) + 1,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/planning");
  return {};
}

export async function renameRoomAction(id: string, naam: string) {
  const supabase = await createClient();
  await supabase.from("labs").update({ naam }).eq("id", id);
  revalidatePath("/planning");
}

export async function toggleRoomActiveAction(id: string, actief: boolean) {
  const supabase = await createClient();
  await supabase.from("labs").update({ actief }).eq("id", id);
  revalidatePath("/planning");
}

export async function toggleDocentBoekbaarAction(id: string, docentBoekbaar: boolean) {
  const supabase = await createClient();
  await supabase.from("labs").update({ docent_boekbaar: docentBoekbaar }).eq("id", id);
  revalidatePath("/planning");
}

export async function telToekomstigeBoekingenAction(labId: string): Promise<number> {
  const supabase = await createClient();
  const vandaag = format(huidigeDatumAmsterdam(), "yyyy-MM-dd");
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("lab_id", labId)
    .gte("datum", vandaag);
  return count ?? 0;
}

export async function deleteRoomAction(id: string) {
  const supabase = await createClient();
  await supabase.from("labs").delete().eq("id", id);
  revalidatePath("/planning");
}

export async function reorderRoomsAction(orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from("labs").update({ volgorde: i + 1 }).eq("id", id)),
  );
  revalidatePath("/planning");
}

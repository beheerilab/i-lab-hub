"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatAmsterdam } from "@/lib/tijd";

export type ActionState = { error?: string };

export async function addOrderItemAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemNaam = String(formData.get("item_naam") ?? "").trim();
  const aantalRaw = String(formData.get("aantal") ?? "");
  const notitie = String(formData.get("notitie") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();

  const aantal = Number(aantalRaw);
  if (!itemNaam) return { error: "Vul een naam voor het item in." };
  if (!Number.isFinite(aantal) || aantal <= 0) {
    return { error: "Vul een geldig aantal in." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };

  const { error } = await supabase.from("order_items").insert({
    item_naam: itemNaam,
    aantal,
    notitie: notitie || null,
    link: link || null,
    toegevoegd_door: user.id,
  });

  if (error) return { error: "Toevoegen mislukt: " + error.message };

  revalidatePath("/bestellijst");
  return {};
}

export async function deleteOrderItemAction(id: string) {
  const supabase = await createClient();
  await supabase.from("order_items").delete().eq("id", id);
  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
}

export async function markItemOrderedAction(
  itemId: string,
  leverancierId: string,
): Promise<ActionState> {
  const supabase = await createClient();

  const [{ data: item }, { data: leverancier }] = await Promise.all([
    supabase.from("order_items").select("item_naam").eq("id", itemId).single(),
    supabase.from("contacts").select("naam").eq("id", leverancierId).single(),
  ]);

  if (!item) return { error: "Item niet gevonden." };
  if (!leverancier) return { error: "Leverancier niet gevonden." };

  const nu = new Date();
  const factuurnaam = `${formatAmsterdam(nu, "yyyy-MM-dd")} ${leverancier.naam.toUpperCase()} ${item.item_naam}`;

  const { error } = await supabase
    .from("order_items")
    .update({
      status: "besteld",
      besteld_op: nu.toISOString(),
      leverancier_id: leverancierId,
      factuurnaam,
    })
    .eq("id", itemId);

  if (error) return { error: "Markeren mislukt: " + error.message };

  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
  return {};
}

export async function toggleBinnenAction(itemId: string, binnen: boolean) {
  const supabase = await createClient();
  await supabase
    .from("order_items")
    .update({ status: binnen ? "binnen" : "besteld", binnen_op: binnen ? new Date().toISOString() : null })
    .eq("id", itemId);
  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
}

export async function setFactuurAangevraagdAction(itemId: string, waarde: boolean) {
  const supabase = await createClient();
  await supabase.from("order_items").update({ factuur_aangevraagd: waarde }).eq("id", itemId);
  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
}

export async function setFactuurOpgeslagenAction(itemId: string, waarde: boolean) {
  const supabase = await createClient();
  await supabase.from("order_items").update({ factuur_opgeslagen: waarde }).eq("id", itemId);
  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
}

export async function archiveOrderItemAction(itemId: string) {
  const supabase = await createClient();
  await supabase.from("order_items").update({ gearchiveerd: true }).eq("id", itemId);
  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
}

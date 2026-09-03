"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
}

export async function markAsOrderedAction(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("markeer_bestellijst_als_besteld");

  if (error) return { error: error.message };

  revalidatePath("/bestellijst");
  revalidatePath("/bestellijst/historie");
  return {};
}

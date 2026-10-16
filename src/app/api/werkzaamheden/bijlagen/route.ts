import { NextResponse } from "next/server";
import { requireGeenDocent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024;
const TOEGESTAAN = /^(image\/(png|jpe?g|gif|webp|heic)|application\/(pdf|msword|vnd\.ms-excel|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\..+)|text\/plain)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bijlage toevoegen: multipart met `taskId` en `file`. */
export async function POST(request: Request) {
  const { userId, profile } = await requireGeenDocent();
  const form = await request.formData().catch(() => null);
  const taskId = String(form?.get("taskId") ?? "");
  const file = form?.get("file");
  if (!UUID.test(taskId) || !(file instanceof File)) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Bestand is groter dan 10 MB" }, { status: 400 });
  if (!TOEGESTAAN.test(file.type)) {
    return NextResponse.json({ error: "Dit bestandstype is niet toegestaan (foto, pdf, Word/Excel/PowerPoint of tekst)" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: taak } = await supabase.from("werkzaamheden").select("id, who").eq("id", taskId).maybeSingle();
  if (!taak) return NextResponse.json({ error: "Taak niet gevonden" }, { status: 404 });
  const mag = profile.role === "admin" || taak.who === userId || taak.who === "samen";
  if (!mag) return NextResponse.json({ error: "Je mag geen bijlage toevoegen aan deze taak" }, { status: 403 });

  const veilig = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80) || "bestand";
  const pad = `${taskId}/${crypto.randomUUID()}-${veilig}`;
  const { error: upErr } = await supabase.storage
    .from("werkzaamheden-bijlagen")
    .upload(pad, file, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: rij, error } = await supabase
    .from("werkzaamheden_bijlagen")
    .insert({ task_id: taskId, naam: file.name.slice(0, 200), pad, type: file.type, grootte: file.size, created_by: userId })
    .select("id")
    .single();
  if (error || !rij) {
    await supabase.storage.from("werkzaamheden-bijlagen").remove([pad]);
    return NextResponse.json({ error: error?.message ?? "Opslaan mislukt" }, { status: 500 });
  }
  const { data: url } = await supabase.storage.from("werkzaamheden-bijlagen").createSignedUrl(pad, 3600);
  return NextResponse.json({
    bijlage: {
      id: rij.id,
      naam: file.name,
      url: url?.signedUrl ?? "",
      type: file.type,
      grootte: file.size,
      door: profile.full_name || "jij",
      mine: true,
    },
  });
}

/** Bijlage verwijderen: ?id=<bijlage-id> (beheerder of de uploader). */
export async function DELETE(request: Request) {
  await requireGeenDocent();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  const supabase = await createClient();
  const { data: rij } = await supabase.from("werkzaamheden_bijlagen").select("pad").eq("id", id).maybeSingle();
  if (!rij) return NextResponse.json({ error: "Niet gevonden of geen rechten" }, { status: 404 });
  const { error } = await supabase.from("werkzaamheden_bijlagen").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  await supabase.storage.from("werkzaamheden-bijlagen").remove([rij.pad]);
  return NextResponse.json({ ok: true });
}

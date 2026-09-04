import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { huidigSchooljaar, schooljaarBereik } from "@/lib/schooljaar";
import { berekenJaaroverzicht, type Uitsplitsing } from "@/lib/jaaroverzicht";

function voegUitsplitsingToe(
  workbook: ExcelJS.Workbook,
  naam: string,
  kolomLabel: string,
  data: Uitsplitsing[],
) {
  const sheet = workbook.addWorksheet(naam);
  sheet.columns = [
    { header: kolomLabel, key: "label", width: 30 },
    { header: "Aantal lessen", key: "aantalLessen", width: 16 },
    { header: "Aantal leerlingen", key: "aantalLeerlingen", width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const rij of data) sheet.addRow(rij);
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const supabase = await createClient();

  const schooljaar = request.nextUrl.searchParams.get("schooljaar") || huidigSchooljaar();
  const { start, eind } = schooljaarBereik(schooljaar);

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("vak, school, datum, aantal_leerlingen, labs(naam)")
    .gte("datum", start)
    .lte("datum", eind);

  const boekingen = (bookingsRaw ?? []).map((b) => ({
    vak: b.vak,
    school: b.school,
    datum: b.datum,
    aantal_leerlingen: b.aantal_leerlingen,
    lab_naam: b.labs?.naam || "onbekend",
  }));

  const data = berekenJaaroverzicht(boekingen);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "i-lab Hub";
  workbook.created = new Date();

  const overzicht = workbook.addWorksheet("Overzicht");
  overzicht.columns = [
    { header: "Schooljaar", key: "label", width: 20 },
    { header: "Waarde", key: "waarde", width: 16 },
  ];
  overzicht.getRow(1).font = { bold: true };
  overzicht.addRow({ label: "Schooljaar", waarde: schooljaar });
  overzicht.addRow({ label: "Totaal aantal lessen/activiteiten", waarde: data.totaalLessen });
  overzicht.addRow({ label: "Totaal aantal leerlingen", waarde: data.totaalLeerlingen });

  voegUitsplitsingToe(workbook, "Per vak", "Vak", data.perVak);
  voegUitsplitsingToe(workbook, "Per school", "School", data.perSchool);
  voegUitsplitsingToe(workbook, "Per maand", "Maand", data.perMaand);
  voegUitsplitsingToe(workbook, "Per lab", "Lab", data.perLab);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="jaaroverzicht-${schooljaar}.xlsx"`,
    },
  });
}

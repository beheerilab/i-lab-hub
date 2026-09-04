import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { BestellijstTabs } from "./tabs";
import { OrderItemRow } from "./order-item-row";

export default async function BestellijstPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: items }, { data: contacts }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*, profiles(full_name), contacts(naam)")
      .eq("gearchiveerd", false)
      .order("created_at", { ascending: true }),
    supabase.from("contacts").select("id, naam").eq("soort", "leverancier").order("naam"),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Bestellijst</h1>
      <p className="mb-6 text-white/80">
        De beheerder markeert per item wanneer het besteld is.
      </p>

      <BestellijstTabs active="actief" />

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Actieve lijst</h2>
        {!items || items.length === 0 ? (
          <p className="text-muted">Er staat nog niets op de bestellijst.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <OrderItemRow
                key={item.id}
                id={item.id}
                itemNaam={item.item_naam}
                aantal={item.aantal}
                notitie={item.notitie}
                link={item.link}
                toegevoegdDoorNaam={item.profiles?.full_name || "onbekend"}
                datum={formatAmsterdam(item.created_at, "d MMMM yyyy")}
                magVerwijderen={profile.role === "admin" || item.toegevoegd_door === userId}
                magBestellen={profile.role === "admin"}
                contacts={contacts ?? []}
                status={item.status}
                leverancierNaam={item.contacts?.naam || "onbekend"}
                besteldOp={item.besteld_op ? formatAmsterdam(item.besteld_op, "d MMM yyyy") : "-"}
                factuurnaam={item.factuurnaam || ""}
                binnen={item.status === "binnen"}
                factuurAangevraagd={item.factuur_aangevraagd}
                factuurOpgeslagen={item.factuur_opgeslagen}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

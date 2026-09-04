import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { BestellijstTabs } from "../tabs";
import { HistorieRow } from "../historie-row";

export default async function BestellijstHistoriePage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("order_items")
    .select("*, contacts(naam)")
    .in("status", ["besteld", "binnen"])
    .order("besteld_op", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Bestellijst</h1>
      <p className="mb-6 text-white/80">Eerder bestelde items, per stuk bijgehouden.</p>

      <BestellijstTabs active="historie" />

      <Card>
        {!items || items.length === 0 ? (
          <p className="text-muted">Er is nog geen item besteld.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <HistorieRow
                key={item.id}
                id={item.id}
                itemNaam={item.item_naam}
                aantal={item.aantal}
                leverancierNaam={item.contacts?.naam || "onbekend"}
                besteldOp={item.besteld_op ? formatAmsterdam(item.besteld_op, "d MMM yyyy") : "-"}
                factuurnaam={item.factuurnaam || ""}
                binnen={item.status === "binnen"}
                factuurAangevraagd={item.factuur_aangevraagd}
                factuurOpgeslagen={item.factuur_opgeslagen}
                magBeheren={profile.role === "admin"}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

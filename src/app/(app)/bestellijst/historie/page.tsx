import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatAmsterdam } from "@/lib/tijd";
import { Card } from "@/components/ui/card";
import { BestellijstTabs } from "../tabs";

export default async function BestellijstHistoriePage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: batches } = await supabase
    .from("order_batches")
    .select("*, profiles(full_name), order_items(*)")
    .order("besteld_op", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Bestellijst</h1>
      <p className="mb-6 text-white/80">Eerdere bestellingen, gegroepeerd per bestelmoment.</p>

      <BestellijstTabs active="historie" />

      {!batches || batches.length === 0 ? (
        <Card>
          <p className="text-muted">Er is nog geen bestelling geplaatst.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => (
            <Card key={batch.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">
                  Besteld op {formatAmsterdam(batch.besteld_op, "d MMMM yyyy 'om' HH:mm")}
                </h2>
                <span className="text-sm text-muted">door {batch.profiles?.full_name || "onbekend"}</span>
              </div>
              <ul className="divide-y divide-border">
                {batch.order_items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2">
                    <span>{item.item_naam}</span>
                    <span className="text-muted">× {item.aantal}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

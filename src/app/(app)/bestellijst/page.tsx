import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { BestellijstTabs } from "./tabs";
import { AddItemForm } from "./add-item-form";
import { OrderItemRow } from "./order-item-row";
import { MarkAsOrderedButton } from "./mark-as-ordered-button";

export default async function BestellijstPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("order_items")
    .select("*, profiles(full_name)")
    .is("order_batch_id", null)
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Bestellijst</h1>
      <p className="mb-6 text-white/80">
        Voeg materiaal toe dat besteld moet worden. De beheerder markeert de lijst
        als besteld zodra de bestelling geplaatst is.
      </p>

      <BestellijstTabs active="actief" />

      <AddItemForm />

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Actieve lijst</h2>
          {profile.role === "admin" && items && items.length > 0 && (
            <MarkAsOrderedButton />
          )}
        </div>
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
                datum={format(new Date(item.created_at), "d MMMM yyyy", { locale: nl })}
                magVerwijderen={profile.role === "admin" || item.toegevoegd_door === userId}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

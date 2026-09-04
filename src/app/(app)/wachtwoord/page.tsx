import { requireProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { WachtwoordForm } from "./wachtwoord-form";

export default async function WachtwoordPage() {
  await requireProfile();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Wachtwoord wijzigen</h1>
      <p className="mb-6 text-white/80">Stel een nieuw wachtwoord in voor je account.</p>
      <Card className="max-w-lg">
        <WachtwoordForm />
      </Card>
    </div>
  );
}

import { Card } from "@/components/ui/card";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Card>
      <p className="text-muted">{title} wordt binnenkort toegevoegd.</p>
    </Card>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function HerstelForm() {
  const router = useRouter();
  const [gereed, setGereed] = useState(false);
  const [linkOngeldig, setLinkOngeldig] = useState(false);
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestig, setBevestig] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // De herstellink van Supabase zet de sessie via het #-deel van de URL;
    // de browser-client verwerkt dat automatisch zodra hij hier laadt.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setGereed(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setGereed(true);
    });

    const timer = setTimeout(() => {
      setGereed((huidig) => {
        if (!huidig) setLinkOngeldig(true);
        return huidig;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (wachtwoord.length < 6) return setError("Wachtwoord moet minstens 6 tekens zijn.");
    if (wachtwoord !== bevestig) return setError("De wachtwoorden komen niet overeen.");

    setBezig(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: wachtwoord });
    setBezig(false);

    if (updateError) return setError("Wijzigen mislukt: " + updateError.message);

    router.push("/dashboard");
  }

  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Nieuw wachtwoord</h1>
        <p className="mt-1 text-sm text-muted">Stel een nieuw wachtwoord in voor je account.</p>
      </div>

      {linkOngeldig ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          Deze link is ongeldig of verlopen. Vraag een nieuwe aan via &ldquo;Wachtwoord
          vergeten&rdquo; op het inlogscherm.
        </p>
      ) : !gereed ? (
        <p className="text-sm text-muted">Even geduld, de link wordt gecontroleerd…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nieuw wachtwoord" htmlFor="wachtwoord">
            <Input
              id="wachtwoord"
              type="password"
              minLength={6}
              required
              autoFocus
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
            />
          </Field>
          <Field label="Bevestig nieuw wachtwoord" htmlFor="wachtwoord_bevestig">
            <Input
              id="wachtwoord_bevestig"
              type="password"
              minLength={6}
              required
              value={bevestig}
              onChange={(e) => setBevestig(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={bezig}>
            {bezig ? "Bezig…" : "Wachtwoord instellen"}
          </Button>
        </form>
      )}
    </Card>
  );
}

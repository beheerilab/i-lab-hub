import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Admin-client met de service-role-sleutel — omzeilt RLS volledig. Alleen
 * gebruiken vanuit server-only code die zelf al met requireAdmin() heeft
 * gecontroleerd dat de aanroeper echt beheerder is (bijv. een wachtwoord
 * resetten via auth.admin.updateUserById, wat de gewone client niet kan).
 * Geeft null terug zolang SUPABASE_SERVICE_ROLE_KEY nog niet is ingesteld.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!client) {
    client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return client;
}

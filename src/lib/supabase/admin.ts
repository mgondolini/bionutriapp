import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Client con secret key: BYPASSA la RLS (NF-03).
 * Da usare solo nei repository e solo quando la RLS non è applicabile
 * (es. attivazione dell'invito, creazione degli utenti). L'import fuori da
 * src/server/repositories è vietato da ESLint.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

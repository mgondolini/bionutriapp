import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Client Supabase per i Client Components (browser).
 * Usa solo chiavi pubbliche: la sicurezza dei dati è garantita dalla RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Client Supabase per Server Components, Server Actions e Route Handlers.
 * Crea sempre un nuovo client per ogni richiesta (non condividerlo in variabili globali).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` chiamato da un Server Component: può essere ignorato
            // perché il proxy (src/proxy.ts) aggiorna la sessione a ogni richiesta.
          }
        },
      },
    },
  );
}

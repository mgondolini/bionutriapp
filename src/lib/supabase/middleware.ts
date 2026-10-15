import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

/**
 * Aggiorna (refresh) la sessione Supabase a ogni richiesta e riscrive i cookie
 * di autenticazione sulla risposta. Invocato da src/proxy.ts.
 * Restituisce anche il client e l'id dell'utente, usati dal proxy per lo smistamento.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Non inserire codice tra createServerClient e getClaims():
  // getClaims() valida il JWT e, se necessario, esegue il refresh della sessione.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;

  // Restituire sempre `response` così com'è, per non perdere i cookie aggiornati.
  return { response, supabase, userId };
}

import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// In Next.js 16 la convenzione `middleware` è stata rinominata in `proxy`.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Esegue il proxy su tutte le route tranne:
     * - _next/static, _next/image (asset di Next.js)
     * - favicon.ico e file statici (immagini, ecc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

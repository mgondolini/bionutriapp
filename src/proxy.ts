import { NextResponse, type NextRequest } from "next/server";

import {
  decideRoute,
  isAlwaysPublic,
  type RouteRole,
} from "@/lib/auth/route-decision";
import { resolveUserContext } from "@/lib/auth/user-context";
import { updateSession } from "@/lib/supabase/middleware";
import { fetchUserContextRows } from "@/server/repositories/session.repository";

/**
 * Primo livello di controllo (DEV-03a): rinnova la sessione e smista l'utente
 * nell'area del proprio ruolo. Fa SOLO smistamento: l'autorizzazione vera è nei
 * layout (getSession), nelle Server Actions e nella RLS.
 * In Next.js 16 la convenzione `middleware` è stata rinominata in `proxy`.
 */
export async function proxy(request: NextRequest) {
  const { response, supabase, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (isAlwaysPublic(pathname)) return response;

  let role: RouteRole = "anonymous";
  if (userId) {
    const context = resolveUserContext(await fetchUserContextRows(supabase));
    role = context.kind === "none" ? "anonymous" : context.kind;
  }

  const decision = decideRoute({ pathname, search, role });
  if (decision.type === "next") return response;

  // Il redirect deve portare con sé i cookie di sessione appena rinnovati.
  const redirect = NextResponse.redirect(new URL(decision.to, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
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

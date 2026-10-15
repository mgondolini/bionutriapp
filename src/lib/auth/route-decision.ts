/**
 * Decisione di smistamento del proxy (funzione pura, testata con Vitest).
 * Il proxy fa SOLO smistamento: l'autorizzazione vera resta nei layout
 * (getSession), nelle Server Actions e nella RLS (DEV-03).
 */
import { ROUTES } from "@/lib/constants/domain";

export type RouteRole = "anonymous" | "staff" | "client" | "client_disabled";

export type RouteDecision = { type: "next" } | { type: "redirect"; to: string };

/** Parametro della pagina di login con il percorso a cui tornare. */
export const NEXT_PARAM = "next";

const HOME: Record<RouteRole, string> = {
  anonymous: ROUTES.login,
  staff: ROUTES.admin.home,
  client: ROUTES.client.home,
  client_disabled: ROUTES.suspended,
};

/** Area riservata a ciascun ruolo. */
const AREA: Partial<Record<RouteRole, string>> = {
  staff: ROUTES.admin.home,
  client: ROUTES.client.home,
  client_disabled: ROUTES.suspended,
};

/** Rotte sempre accessibili, senza leggere il ruolo (manifest, icone, attivazione). */
const ALWAYS_PUBLIC = [
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/favicon.ico",
  ROUTES.activate,
  ROUTES.newPassword,
];

/** Pagine per chi non ha ancora una sessione: un utente autenticato va alla propria area. */
const GUEST_ONLY = [ROUTES.login, ROUTES.recoverPassword];

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function homeFor(role: RouteRole): string {
  return HOME[role];
}

/** Vero se la rotta non richiede di conoscere il ruolo: il proxy evita la query. */
export function isAlwaysPublic(pathname: string): boolean {
  return ALWAYS_PUBLIC.some((base) => matches(pathname, base));
}

/**
 * Percorso di ritorno dopo il login, solo se interno e nell'area del ruolo;
 * altrimenti null (si va alla home del ruolo).
 */
export function safeNextPath(
  next: string | null | undefined,
  role: RouteRole,
): string | null {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(next, "http://localhost");
  } catch {
    return null;
  }
  if (url.origin !== "http://localhost") return null;
  const area = AREA[role];
  if (!area || !matches(url.pathname, area)) return null;
  return `${url.pathname}${url.search}`;
}

function loginRedirect(pathname: string, search: string): RouteDecision {
  const params = new URLSearchParams({ [NEXT_PARAM]: `${pathname}${search}` });
  return { type: "redirect", to: `${ROUTES.login}?${params.toString()}` };
}

export function decideRoute(input: {
  pathname: string;
  search: string;
  role: RouteRole;
}): RouteDecision {
  const { pathname, search, role } = input;

  if (isAlwaysPublic(pathname)) return { type: "next" };

  if (pathname === "/") return { type: "redirect", to: homeFor(role) };

  if (GUEST_ONLY.some((base) => matches(pathname, base))) {
    if (role === "anonymous") return { type: "next" };
    const next = new URLSearchParams(search).get(NEXT_PARAM);
    return { type: "redirect", to: safeNextPath(next, role) ?? homeFor(role) };
  }

  const protectedAreas: [string, RouteRole][] = [
    [ROUTES.admin.home, "staff"],
    [ROUTES.client.home, "client"],
    [ROUTES.suspended, "client_disabled"],
  ];
  for (const [base, owner] of protectedAreas) {
    if (!matches(pathname, base)) continue;
    if (role === owner) return { type: "next" };
    if (role === "anonymous") return loginRedirect(pathname, search);
    return { type: "redirect", to: homeFor(role) };
  }

  return { type: "next" };
}

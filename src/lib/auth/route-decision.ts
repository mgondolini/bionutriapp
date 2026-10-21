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

/** Parametro della pagina di login con il motivo del ritorno al login (fase 7). */
export const LOGIN_REASON_PARAM = "motivo";
export const LOGIN_REASONS = {
  loggedOut: "uscito",
  expired: "sessione-scaduta",
} as const;
export type LoginReason = keyof typeof LOGIN_REASONS;

/** "/login?next=…&motivo=…" */
export function loginUrl(
  options: { next?: string | null; reason?: LoginReason } = {},
): string {
  const params = new URLSearchParams();
  if (options.next) params.set(NEXT_PARAM, options.next);
  if (options.reason)
    params.set(LOGIN_REASON_PARAM, LOGIN_REASONS[options.reason]);
  const query = params.toString();
  return query ? `${ROUTES.login}?${query}` : ROUTES.login;
}

/** Motivo letto dall'URL del login; null se assente o sconosciuto. */
export function parseLoginReason(value: unknown): LoginReason | null {
  const entry = Object.entries(LOGIN_REASONS).find(
    ([, slug]) => slug === value,
  );
  return entry ? (entry[0] as LoginReason) : null;
}

/**
 * Vero se la richiesta porta i cookie di sessione di Supabase
 * (`sb-<progetto>-auth-token`, anche divisi in `.0`, `.1`…): con i cookie ma
 * senza una sessione valida, la sessione è scaduta o è stata revocata.
 */
export function hasAuthCookie(names: readonly string[]): boolean {
  return names.some((name) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

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
  ROUTES.confirmEmail,
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

function loginRedirect(
  pathname: string,
  search: string,
  sessionExpired: boolean,
): RouteDecision {
  return {
    type: "redirect",
    to: loginUrl({
      next: `${pathname}${search}`,
      reason: sessionExpired ? "expired" : undefined,
    }),
  };
}

/**
 * `sessionExpired`: la richiesta aveva i cookie di sessione ma la sessione
 * non è più valida (scaduta, refresh token non valido, revocata): il login
 * mostra "La sessione è scaduta, accedi di nuovo".
 */
export function decideRoute(input: {
  pathname: string;
  search: string;
  role: RouteRole;
  sessionExpired?: boolean;
}): RouteDecision {
  const { pathname, search, role, sessionExpired = false } = input;

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
    if (role === "anonymous") {
      return loginRedirect(pathname, search, sessionExpired);
    }
    return { type: "redirect", to: homeFor(role) };
  }

  return { type: "next" };
}

/**
 * Costanti di dominio (DEV-08): unica fonte per valori e tipi.
 * Le etichette visibili all'utente stanno in src/lib/copy/it.ts.
 */

/** Stati dell'account salvati nel database. */
export const STORED_ACCOUNT_STATUSES = [
  "to_invite",
  "invited",
  "active",
  "disabled",
] as const;

/** Stati dell'account mostrati all'utente: "invite_expired" è calcolato, non salvato. */
export const ACCOUNT_STATUSES = [
  "to_invite",
  "invited",
  "invite_expired",
  "active",
  "disabled",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const JOURNEY_STAGES = [
  "onboarding",
  "in_progress",
  "paused",
  "completed",
] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const FILE_CATEGORIES = ["diet", "workout", "report"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

/** Ruoli dei professionisti dello studio (la v3.0 aggiungerà "collaborator"). */
export const STAFF_ROLES = ["owner"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Fasi in cui file e tracking del cliente restano bloccati (C-09). */
export const LOCKED_JOURNEY_STAGES: readonly JourneyStage[] = ["onboarding"];

export const ROUTES = {
  login: "/login",
  recoverPassword: "/recupera-password",
  newPassword: "/nuova-password",
  activate: "/attiva",
  suspended: "/accesso-sospeso",
  admin: {
    home: "/admin",
    clients: "/admin/clienti",
    settings: "/admin/impostazioni",
  },
  client: {
    home: "/app",
    diets: "/app/diete",
    workouts: "/app/allenamenti",
    reports: "/app/report",
    tracking: "/app/tracking",
    profile: "/app/profilo",
  },
} as const;

/** Voci del menu del cliente (C-01); `locked` = nascosta in Onboarding. */
export const CLIENT_NAV = [
  { key: "diets", href: ROUTES.client.diets, locked: true },
  { key: "workouts", href: ROUTES.client.workouts, locked: true },
  { key: "reports", href: ROUTES.client.reports, locked: true },
  { key: "tracking", href: ROUTES.client.tracking, locked: true },
] as const;
export type ClientNavKey = (typeof CLIENT_NAV)[number]["key"];

/** Voci della sidebar admin; `ownerOnly` = visibile solo al titolare. */
export const ADMIN_NAV = [
  { key: "clients", href: ROUTES.admin.clients, ownerOnly: false },
  { key: "settings", href: ROUTES.admin.settings, ownerOnly: true },
] as const;
export type AdminNavKey = (typeof ADMIN_NAV)[number]["key"];

/** Branding predefinito (NF-07), usato quando lo studio non è disponibile. */
export const DEFAULT_PRIMARY_COLOR = "#2E6A4E";
export const DARK_TEXT_COLOR = "#18211D";
export const LIGHT_TEXT_COLOR = "#FFFFFF";
export const APP_BACKGROUND_COLOR = "#F5F6F2";
/** Contrasto minimo per il testo normale (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;

/** Logo dello studio (bucket studio-assets). */
export const STUDIO_ASSETS_BUCKET = "studio-assets";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

export const PASSWORD_MIN_LENGTH = 8;

/** Stati dell'account per cui si può inviare (o reinviare) l'invito su WhatsApp (N-01). */
export const INVITABLE_STATUSES: readonly AccountStatus[] = [
  "to_invite",
  "invited",
  "invite_expired",
];

/** Origine del cliente: "imported" = già nel database (CSV o dati completi), "new" = solo nome e cellulare. */
export const CLIENT_ORIGINS = ["imported", "new"] as const;
export type ClientOrigin = (typeof CLIENT_ORIGINS)[number];

/** Fase con cui nasce un cliente, uguale a quella che avrà dopo l'attivazione (A-04). */
export const INITIAL_STAGE_BY_ORIGIN: Record<ClientOrigin, JourneyStage> = {
  imported: "in_progress",
  new: "onboarding",
};

/** Modalità del dialog "Nuovo cliente" (A-04) e origine corrispondente. */
export const CLIENT_CREATION_MODES = ["new", "full"] as const;
export type ClientCreationMode = (typeof CLIENT_CREATION_MODES)[number];
export const ORIGIN_BY_CREATION_MODE: Record<ClientCreationMode, ClientOrigin> =
  {
    new: "new",
    full: "imported",
  };

/** Nomi dei parametri dell'URL dell'elenco clienti (filtri e ricerca condivisibili). */
export const CLIENT_LIST_PARAMS = {
  status: "stato",
  stage: "fase",
  query: "q",
} as const;
export const CLIENT_SEARCH_MAX_LENGTH = 100;
/** Cifre minime perché la ricerca consideri anche il cellulare. */
export const PHONE_SEARCH_MIN_DIGITS = 3;

/** Paese predefinito per i numeri scritti senza prefisso internazionale. */
export const DEFAULT_PHONE_COUNTRY = "IT";

/** Import da CSV (A-05): limiti validati nel browser e sul server. */
export const CSV_MAX_ROWS = 1000;
export const CSV_MAX_BYTES = 1024 * 1024;

/** Motivi per cui una riga del CSV viene scartata. */
export const CSV_DISCARD_REASONS = [
  "missing_phone",
  "invalid_phone",
  "missing_name",
  "duplicate_in_file",
  "already_in_studio",
] as const;
export type CsvDiscardReason = (typeof CSV_DISCARD_REASONS)[number];

/** Correzioni applicate a una riga valida (il dato non valido viene tralasciato). */
export const CSV_ROW_WARNINGS = [
  "invalid_email_dropped",
  "invalid_birth_date_dropped",
] as const;
export type CsvRowWarning = (typeof CSV_ROW_WARNINGS)[number];

/** Errori del file CSV nel suo insieme. */
export const CSV_FILE_ERRORS = [
  "empty",
  "missing_phone_column",
  "too_many_rows",
  "too_large",
] as const;
export type CsvFileError = (typeof CSV_FILE_ERRORS)[number];

/** Schede della scheda cliente (A4), rotte figlie di /admin/clienti/[id]. */
export const CLIENT_TABS = ["profilo", "file", "tracking"] as const;
export type ClientTab = (typeof CLIENT_TABS)[number];

export function clientDetailPath(
  clientId: string,
  tab: ClientTab = "profilo",
): string {
  return `${ROUTES.admin.clients}/${clientId}/${tab}`;
}

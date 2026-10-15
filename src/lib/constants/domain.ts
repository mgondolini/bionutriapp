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

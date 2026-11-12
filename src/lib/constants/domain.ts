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
  confirmEmail: "/conferma-email",
  suspended: "/accesso-sospeso",
  privacy: "/privacy",
  admin: {
    home: "/admin",
    clients: "/admin/clienti",
    videos: "/admin/video",
    settings: "/admin/impostazioni",
    profile: "/admin/profilo",
  },
  client: {
    home: "/app",
    diets: "/app/diete",
    workouts: "/app/allenamenti",
    reports: "/app/report",
    videos: "/app/video",
    tracking: "/app/tracking",
    profile: "/app/profilo",
    install: "/app/installa",
  },
} as const;

/**
 * Versione dell'informativa privacy (NF-06), salvata con i consensi
 * dell'attivazione (privacy_consents). Va cambiata a ogni modifica sostanziale
 * del testo della pagina /privacy.
 */
export const PRIVACY_POLICY_VERSION = "1.0-bozza";

/** Voci del menu del cliente (C-01); `locked` = nascosta in Onboarding. */
export const CLIENT_NAV = [
  { key: "diets", href: ROUTES.client.diets, locked: true },
  { key: "workouts", href: ROUTES.client.workouts, locked: true },
  { key: "reports", href: ROUTES.client.reports, locked: true },
  // in Onboarding si vedono solo le cartelle "anche in Onboarding" (RLS)
  { key: "videos", href: ROUTES.client.videos, locked: false },
  { key: "tracking", href: ROUTES.client.tracking, locked: true },
] as const;
export type ClientNavKey = (typeof CLIENT_NAV)[number]["key"];

/** Voci della sidebar admin; `ownerOnly` = visibile solo al titolare. */
export const ADMIN_NAV = [
  { key: "clients", href: ROUTES.admin.clients, ownerOnly: false },
  { key: "videos", href: ROUTES.admin.videos, ownerOnly: false },
  { key: "settings", href: ROUTES.admin.settings, ownerOnly: true },
] as const;
export type AdminNavKey = (typeof ADMIN_NAV)[number]["key"];

/** Branding predefinito (NF-07), usato quando lo studio non è disponibile. */
export const DEFAULT_PRIMARY_COLOR = "#1F7A5C";
export const DARK_TEXT_COLOR = "#1F3A34";
export const LIGHT_TEXT_COLOR = "#FFFFFF";
/** Sfondo "Perla" di tutte le pagine (--background): manifest, barra del telefono, splash, contrasto di --primary-ink. */
export const APP_BACKGROUND_COLOR = "#F8F7F4";
/** Contrasto minimo per il testo normale (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;
/** Voce attiva del menu laterale: bianco al 12% sul Profondo (DARK_TEXT_COLOR). */
export const SIDEBAR_ACTIVE_COLOR = "#3A524C";

/** Logo dello studio (bucket studio-assets). */
export const STUDIO_ASSETS_BUCKET = "studio-assets";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];
/**
 * Ritaglio del logo nel browser: l'immagine scelta (anche grande, anche WebP)
 * diventa un PNG quadrato da OUTPUT px; se supera LOGO_MAX_BYTES si riprova
 * con i lati più piccoli, mai sotto MIN (icona da 512 px dell'app installata).
 */
export const LOGO_SIZE = {
  output: 1024,
  fallbacks: [768, 512],
  min: 512,
} as const;
export const LOGO_SOURCE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const LOGO_SOURCE_MAX_BYTES = 15 * 1024 * 1024;
/** Margine per lato in "Adatta con margine" (quota del lato). */
export const LOGO_FIT_MARGIN = 0.08;

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt (Supabase Auth) considera al massimo 72 byte. */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Colonne di `clients` che il cliente modifica di sé dal profilo (C-07).
 * Cellulare (identificativo di accesso e numero degli inviti), email (segue
 * Auth dopo la conferma), stato, fase e studio restano esclusi: li ricontrolla
 * anche il trigger guard_client.
 */
export const CLIENT_EDITABLE_FIELDS = [
  "first_name",
  "last_name",
  "birth_date",
  "height_cm",
] as const;
export type ClientEditableField = (typeof CLIENT_EDITABLE_FIELDS)[number];

/** Limiti dei campi del profilo, uguali ai check del database. */
export const NAME_MAX_LENGTH = 80;
/** Altezza del cliente in centimetri interi (check di `clients.height_cm`). DA CONFERMARE */
export const HEIGHT_LIMITS = { min: 100, max: 230 } as const;
export const TITLE_MAX_LENGTH = 20;

/**
 * Cambio email: uguale a `double_confirm_changes` di supabase/config.toml (e
 * della dashboard sul progetto remoto). Chi ha già un'email conferma da
 * entrambi gli indirizzi, chi non l'aveva solo dal nuovo.
 */
export const EMAIL_CHANGE_DOUBLE_CONFIRM = true;

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

/**
 * Fase scelta alla creazione e all'import (A-04, A-05). Il database la ricava
 * dall'origine (trigger guard_client) e attivate_client la conferma, quindi
 * la scelta si salva come origine: In percorso = 'imported', Onboarding = 'new'.
 */
export const CREATION_STAGES = ["in_progress", "onboarding"] as const;
export type CreationStage = (typeof CREATION_STAGES)[number];
export const ORIGIN_BY_CREATION_STAGE: Record<CreationStage, ClientOrigin> = {
  in_progress: "imported",
  onboarding: "new",
};

/** Nomi dei parametri dell'URL dell'elenco clienti (filtri e ricerca condivisibili). */
export const CLIENT_LIST_PARAMS = {
  status: "stato",
  stage: "fase",
  query: "q",
  page: "pagina",
} as const;
/** Clienti per pagina nell'elenco dello staff. */
export const CLIENTS_PAGE_SIZE = 20;
export const CLIENT_SEARCH_MAX_LENGTH = 100;
/** Cifre minime perché la ricerca consideri anche il cellulare. */
export const PHONE_SEARCH_MIN_DIGITS = 3;

/** Paese predefinito per i numeri scritti senza prefisso internazionale. */
export const DEFAULT_PHONE_COUNTRY = "IT";

/** Import da CSV (A-05): limiti validati nel browser e sul server. */
export const CSV_MAX_ROWS = 1000;
export const CSV_MAX_BYTES = 1024 * 1024;
/** Righe per pagina nell'anteprima dell'import. */
export const CSV_PREVIEW_PAGE_SIZE = 20;

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
export const CLIENT_TABS = ["profilo", "percorso", "file", "tracking"] as const;
export type ClientTab = (typeof CLIENT_TABS)[number];

export function clientDetailPath(
  clientId: string,
  tab: ClientTab = "profilo",
): string {
  return `${ROUTES.admin.clients}/${clientId}/${tab}`;
}

/** Inviti su WhatsApp (N-01, N-02): token casuale, nel database solo l'hash. */
export const INVITE_TOKEN_BYTES = 32;
export const INVITE_VALIDITY_DAYS = 14;
/** Lunghezza del token in base64url (32 byte → 43 caratteri). */
export const INVITE_TOKEN_LENGTH = 43;

/** Origine di un cambio di fase (ST-04): manuale dallo staff, automatico dal sistema (v2.0). */
export const STAGE_SOURCES = ["manual", "automatic"] as const;
export type StageSource = (typeof STAGE_SOURCES)[number];

/** Durata del blocco in Supabase Auth per un account disattivato (circa 100 anni). */
export const DISABLED_BAN_DURATION = "876000h";

export function activationPath(token: string): string {
  return `${ROUTES.activate}/${token}`;
}

/**
 * File dei clienti (A-08…A-11): bucket privato, solo PDF. Nessun limite di
 * dimensione dell'app: vale quello globale del progetto Supabase.
 */
export const CLIENT_FILES_BUCKET = "client-files";
export const FILE_MIME_TYPE = "application/pdf";
export const FILE_EXTENSION = ".pdf";
/** Ogni PDF inizia con questi byte; un .docx rinominato inizia con "PK". */
export const PDF_MAGIC = "%PDF-";
export const FILE_TITLE_MAX = 150;
export const FILE_NOTE_MAX = 500;
export const FILE_NAME_MAX = 255;
/** Durata degli URL firmati per aprire o scaricare un file (NF-02). */
export const SIGNED_URL_TTL_SECONDS = 60;

/** Apertura di un file: nel visualizzatore del browser o come scaricamento. */
export const FILE_OPEN_MODES = ["view", "download"] as const;
export type FileOpenMode = (typeof FILE_OPEN_MODES)[number];

/** Errori del caricamento, controllati nel browser e di nuovo sul server. */
export const FILE_UPLOAD_ERRORS = [
  "not_pdf",
  "too_large",
  "empty",
  "invalid_pdf",
  "upload_failed",
] as const;
export type FileUploadError = (typeof FILE_UPLOAD_ERRORS)[number];

/** Pagina del cliente per ogni categoria di file (C-04). */
export const CLIENT_FILE_ROUTES: Record<FileCategory, string> = {
  diet: ROUTES.client.diets,
  workout: ROUTES.client.workouts,
  report: ROUTES.client.reports,
};

/** Parametro dell'URL del filtro per categoria nella scheda File. */
export const FILE_LIST_PARAMS = {
  category: "categoria",
  page: "pagina",
} as const;
/** File per pagina: scheda File dello staff e archivio del cliente. */
export const FILES_PAGE_SIZE = 10;

/** Percorso in Storage: {studio_id}/{client_id}/{file_id}.pdf, costruito solo sul server. */
export function clientFilePath(
  studioId: string,
  clientId: string,
  fileId: string,
): string {
  return `${studioId}/${clientId}/${fileId}${FILE_EXTENSION}`;
}

/** Scheda File di un cliente, con il filtro per categoria facoltativo. */
export function clientFilesUrl(
  clientId: string,
  category: FileCategory | null = null,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (category) params.set(FILE_LIST_PARAMS.category, category);
  if (page > 1) params.set(FILE_LIST_PARAMS.page, String(page));
  const search = params.toString();
  const path = clientDetailPath(clientId, "file");
  return search ? `${path}?${search}` : path;
}

/*
 * Tracking (T-01…T-09). Le misure stanno nel database (una riga per studio,
 * create dal trigger seed_default_metrics): qui solo tipi, regole e soglie.
 */
export const METRIC_VALUE_TYPES = [
  "decimal",
  "score_1_5",
  "score_1_10",
] as const;
export type MetricValueType = (typeof METRIC_VALUE_TYPES)[number];

export const METRIC_FREQUENCIES = [
  "monthly_30d",
  "daily",
  "per_session",
] as const;
export type MetricFrequency = (typeof METRIC_FREQUENCIES)[number];

/** Tipi di misura nell'interfaccia: ognuno ha la sua scheda e il suo form. */
export const METRIC_KINDS = ["circumference", "habit", "workout"] as const;
export type MetricKind = (typeof METRIC_KINDS)[number];
export const METRIC_KIND_BY_FREQUENCY: Record<MetricFrequency, MetricKind> = {
  monthly_30d: "circumference",
  daily: "habit",
  per_session: "workout",
};

/** Chi ha inserito o modificato per ultimo una registrazione (A-16). */
export const ENTRY_AUTHOR_ROLES = ["client", "staff"] as const;
export type EntryAuthorRole = (typeof ENTRY_AUTHOR_ROLES)[number];

/** Abitudini giornaliere del check-in (T-06), nell'ordine della schermata C9. */
export const HABIT_KEYS = ["steps", "sleep", "water"] as const;
export type HabitKey = (typeof HABIT_KEYS)[number];

/** Una circonferenza va registrata ogni 30 giorni (T-05). */
export const CIRCUMFERENCE_INTERVAL_DAYS = 30;
/** "In scadenza" nella home: mancano al massimo 3 giorni (C-02). */
export const DUE_SOON_DAYS = 3;
/** Il nutrizionista sposta il prossimo check al massimo di un anno. */
export const MEASURE_CHECK_MAX_DAYS_AHEAD = 365;
/** Ora locale (fuso dello studio) dei promemoria del check: giorno prima e giorno stesso. */
export const MEASURE_CHECK_REMINDER_HOUR = 6;
/** Cifre decimali dei valori delle circonferenze (precisione del metro). */
export const MEASURE_DECIMALS = 1;
export const TRACKING_NOTE_MAX = 500;
/** Righe per pagina nello storico di una misura (il grafico le usa tutte). */
export const HISTORY_PAGE_SIZE = 10;
/** Cambi di fase per pagina nella scheda Profilo (ST-04). */
export const STAGE_HISTORY_PAGE_SIZE = 10;
/** Finestra delle statistiche recenti degli allenamenti (schermata A11). */
export const WORKOUT_RECENT_DAYS = 30;

/** Voti della scala delle abitudini, dal più alto (T-07). */
export const HABIT_SCORES = [5, 4, 3, 2, 1] as const;
export type HabitScore = (typeof HABIT_SCORES)[number];
/** Voto minimo e massimo del check-in (T-06). */
export const HABIT_SCORE_RANGE = {
  min: HABIT_SCORES[HABIT_SCORES.length - 1],
  max: HABIT_SCORES[0],
} as const;
/** Quota dell'obiettivo a cui corrisponde ogni voto: 4 ≈ 75%, 3 ≈ 50%, 2 ≈ 25%. */
export const HABIT_SCORE_SHARES: Record<HabitScore, number> = {
  5: 1,
  4: 0.75,
  3: 0.5,
  2: 0.25,
  1: 0.25,
};
/** Arrotondamento leggibile dei valori della scala: acqua 0,5 L, passi 500, sonno 30 minuti. */
export const HABIT_GOAL_ROUNDING: Record<HabitKey, number> = {
  steps: 500,
  sleep: 0.5,
  water: 0.5,
};
/** Unità dell'obiettivo del sonno (metrics.goal_unit): si scrive in ore e mezze ore. */
export const HOURS_GOAL_UNIT = "ore";
/** Per un'abitudine aggiunta da uno studio, senza un arrotondamento proprio. */
export const DEFAULT_GOAL_ROUNDING = 0.1;

/**
 * Limiti degli obiettivi personali impostati dal nutrizionista (T-07).
 * DA CONFERMARE con il nutrizionista.
 */
export const HABIT_GOAL_LIMITS: Record<
  HabitKey,
  { min: number; max: number; step: number }
> = {
  water: { min: 0.5, max: 6, step: 0.1 },
  steps: { min: 1000, max: 30000, step: 1 },
  sleep: { min: 4, max: 12, step: 0.5 },
};

/** Giorni compilabili dal check-in (T-06) e parametro dell'URL che li sceglie. */
export const CHECKIN_DAYS = ["today", "yesterday"] as const;
export type CheckinDay = (typeof CHECKIN_DAYS)[number];
export const CHECKIN_DAY_PARAM = "giorno";
export const CHECKIN_DAY_SLUGS: Record<CheckinDay, string> = {
  today: "oggi",
  yesterday: "ieri",
};

export const CHECKIN_PATH = `${ROUTES.client.tracking}/check-in`;

export function checkinUrl(day: CheckinDay = "today"): string {
  return day === "today"
    ? CHECKIN_PATH
    : `${CHECKIN_PATH}?${CHECKIN_DAY_PARAM}=${CHECKIN_DAY_SLUGS[day]}`;
}

/** Dettaglio di una misura nell'area cliente: la chiave non contiene "-", quindi non si confonde con "check-in". */
export function trackingMetricPath(metricKey: string): string {
  return `${ROUTES.client.tracking}/${metricKey}`;
}

/** Dettaglio di una misura nella scheda Tracking dello staff (A10, A11). */
export function clientTrackingMetricPath(
  clientId: string,
  metricKey: string,
): string {
  return `${clientDetailPath(clientId, "tracking")}/${metricKey}`;
}

// ---------------------------------------------------------------------
// PWA e notifiche push (fase 8)
// ---------------------------------------------------------------------

/** Schermate di avvio dell'app installata su iOS (`src/lib/pwa/splash.ts`), pubbliche come le icone. */
export const SPLASH_PATH = "/splash";

/** Attività programmate (fase 9): Route Handler protetto da CRON_SECRET (DEV-05). */
export const CRON_PATH = "/api/cron";
export const CRON_MAINTENANCE_PATH = `${CRON_PATH}/manutenzione`;
/** Oggetti caricati ma mai confermati: eliminati dopo 24 ore. */
export const ORPHAN_UPLOAD_MAX_AGE_HOURS = 24;
/** Inviti scaduti da più di 90 giorni: eliminati. */
export const EXPIRED_INVITE_RETENTION_DAYS = 90;

/** Service worker: solo l'area cliente, mai /admin né le pagine di accesso. */
export const SERVICE_WORKER_URL = "/sw.js";
export const SERVICE_WORKER_SCOPE = "/app";
/** Pagina mostrata dal service worker senza rete: statica, senza dati. */
export const OFFLINE_PAGE_URL = "/offline.html";

/** Icona delle notifiche: quella della PWA, con il branding dello studio del dominio. */

/** Endpoint del promemoria serale, chiamato ogni ora da pg_cron (stesso segreto del cron). */
export const INTERNAL_API_PATH = "/api/internal";
export const DAILY_CHECKIN_CRON_PATH = `${INTERNAL_API_PATH}/notifications/daily-checkin`;

/**
 * Tipi di notifica (N-06). Testi in `copy.notifications`, pagina, tag e
 * icone in `src/lib/notifications/catalog.ts`.
 */
export const NOTIFICATION_TYPES = [
  "file_diet",
  "file_workout",
  "file_report",
  "daily_checkin",
  "video",
  "measure_check",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Icona grande delle notifiche: quella della PWA, generata dal logo dello studio. */

export const NOTIFICATION_ICON_URL = "/icon/192";
/** Badge monocromatici per Android (`pnpm notifications:badges`); iOS li ignora. */
export const NOTIFICATION_BADGES_PATH = "/notification-badges";
/** Per quanto il servizio push conserva una notifica se il telefono è spento. */
export const PUSH_TTL_FILE_SECONDS = 24 * 60 * 60;
/** Il promemoria delle 20 dopo le 22 non serve più. */
export const PUSH_TTL_CHECKIN_SECONDS = 2 * 60 * 60;
/** Il promemoria del check delle 6 vale per la giornata. */
export const PUSH_TTL_MEASURE_CHECK_SECONDS = 12 * 60 * 60;
/** Fallimenti consecutivi dopo cui una sottoscrizione si elimina. */
export const PUSH_MAX_CONSECUTIVE_FAILURES = 5;
/** Ora locale (fuso dello studio) del promemoria serale. */
export const DAILY_REMINDER_HOUR = 20;
/** Fuso di uno studio senza indicazione diversa. */
export const DEFAULT_STUDIO_TIMEZONE = "Europe/Rome";
/** Clienti elaborati in parallelo dal promemoria serale. */
export const DAILY_REMINDER_CONCURRENCY = 5;
/** Righe del registro delle notifiche conservate per 90 giorni. */
export const NOTIFICATION_LOG_RETENTION_DAYS = 90;

/**
 * Servizi push a cui il server accetta di inviare (gli endpoint arrivano dal
 * browser: senza questo elenco il server farebbe richieste a indirizzi
 * scelti da altri). Un host vale anche per i suoi sottodomini.
 */
export const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, Android
  "push.apple.com", // Safari e PWA su iPhone (web.push.apple.com)
  "push.services.mozilla.com", // Firefox
  "notify.windows.com", // Edge legacy / Windows
] as const;
export const PUSH_ENDPOINT_MAX_LENGTH = 1024;
export const PUSH_USER_AGENT_MAX_LENGTH = 256;

/*
 * Video (mockup v4): libreria YouTube dello studio in cartelle con un livello
 * di sottocartelle. Niente durata: oEmbed di YouTube non la fornisce.
 */
export const VIDEO_TITLE_MAX = 120;
export const VIDEO_NOTE_MAX = 300;
export const VIDEO_FOLDER_NAME_MAX = 40;
export const VIDEO_FOLDER_DESCRIPTION_MAX = 200;
/** Un video è "Nuovo" per i giorni dopo l'aggiunta (per il cliente, finché non lo apre). */
export const VIDEO_NEW_DAYS = 14;
/** Video per pagina nell'elenco della cartella (cliente). */
export const VIDEOS_PAGE_SIZE = 10;
/** Altri video della stessa cartella sotto il player. */
export const VIDEO_RELATED_LIMIT = 3;
/** oEmbed di YouTube (verifica del link sul server); sovrascrivibile per i test. */
export const YOUTUBE_OEMBED_URL = "https://www.youtube.com/oembed";
export const YOUTUBE_OEMBED_TIMEOUT_MS = 5000;
/**
 * Video ricontrollati a ogni esecuzione del cron di manutenzione (i meno
 * recenti prima), VIDEO_RECHECK_CONCURRENCY richieste a YouTube alla volta.
 */
export const VIDEO_RECHECK_LIMIT = 60;
export const VIDEO_RECHECK_CONCURRENCY = 5;
/** Parametri dell'URL della libreria admin e della cartella del cliente. */
export const VIDEO_PARAMS = { folder: "cartella", filter: "filtro" } as const;
export const VIDEO_FILTER_TO_WATCH = "da-guardare";

export function adminVideoFolderUrl(folderId: string | null): string {
  return folderId
    ? `${ROUTES.admin.videos}?${VIDEO_PARAMS.folder}=${folderId}`
    : ROUTES.admin.videos;
}
export function videoFolderPath(folderId: string, toWatch = false): string {
  const path = `${ROUTES.client.videos}/${folderId}`;
  return toWatch
    ? `${path}?${VIDEO_PARAMS.filter}=${VIDEO_FILTER_TO_WATCH}`
    : path;
}
export function videoPath(folderId: string, videoId: string): string {
  return `${ROUTES.client.videos}/${folderId}/${videoId}`;
}

// ---------------------------------------------------------------------
// Percorso (mockup v5: A17–A19, C5, C19–C21)
// ---------------------------------------------------------------------

/** Durata in mesi: 6 mesi oppure 1 anno. */
export const JOURNEY_DURATIONS = [6, 12] as const;
export type JourneyDuration = (typeof JOURNEY_DURATIONS)[number];
/** Check del percorso, senza onboarding né omaggio aggiunto. */
export const JOURNEY_CHECKS_BY_DURATION: Record<JourneyDuration, number> = {
  6: 5,
  12: 11,
};
/** Primo percorso, estensione (entro la soglia) o ripresa (oltre). */
export const JOURNEY_KINDS = ["first", "extension", "resume"] as const;
export type JourneyKind = (typeof JOURNEY_KINDS)[number];
/** Check omaggio: nessuno, aggiunto ai check del percorso o incluso. */
export const JOURNEY_GIFT_MODES = ["none", "added", "included"] as const;
export type JourneyGiftMode = (typeof JOURNEY_GIFT_MODES)[number];
export const JOURNEY_STATUSES = ["active", "concluded"] as const;
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];
export const JOURNEY_SESSION_TYPES = ["onboarding", "check", "gift"] as const;
export type JourneySessionType = (typeof JOURNEY_SESSION_TYPES)[number];
/** Stati salvati; "prossima" e "in ritardo" si calcolano. */
export const JOURNEY_SESSION_STATUSES = ["todo", "done", "skipped"] as const;
export type JourneySessionStatus = (typeof JOURNEY_SESSION_STATUSES)[number];
/**
 * Giorni dalla fine del percorso concluso entro cui si suggerisce
 * l'estensione (senza onboarding, con omaggio aggiunto); oltre, la ripresa.
 * DA CONFERMARE: in futuro impostazione dello studio.
 */
export const JOURNEY_EXTENSION_THRESHOLD_DAYS = 60;
/** Ora locale (fuso dello studio) dei promemoria: sera prima e mattina stessa. DA CONFERMARE. */
export const JOURNEY_REMINDER_HOURS = { dayBefore: 18, sameDay: 8 } as const;
/** Le push del percorso valgono per la giornata. */
export const PUSH_TTL_JOURNEY_SECONDS = 12 * 60 * 60;
export const JOURNEY_NOTE_MAX = 500;
/** Pagina Percorso del cliente (anche destinazione delle push). */
export const JOURNEY_CLIENT_PATH = "/app/percorso";
/** Parametro del percorso mostrato (storico admin e percorsi precedenti del cliente). */
export const JOURNEY_PARAM = "percorso";
export const JOURNEY_CRON_PATH = `${INTERNAL_API_PATH}/notifications/journeys`;

export function journeyIcsPath(sessionId: string): string {
  return `${JOURNEY_CLIENT_PATH}/sessioni/${sessionId}/calendario`;
}
export function clientJourneyUrl(journeyId?: string): string {
  return journeyId
    ? `${JOURNEY_CLIENT_PATH}?${JOURNEY_PARAM}=${journeyId}`
    : JOURNEY_CLIENT_PATH;
}
export function adminJourneyUrl(clientId: string, journeyId?: string): string {
  const path = clientDetailPath(clientId, "percorso");
  return journeyId ? `${path}?${JOURNEY_PARAM}=${journeyId}` : path;
}

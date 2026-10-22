/*
 * Evento `beforeinstallprompt` (Chrome, Edge, Samsung Internet): permette un
 * pulsante "Installa" nella guida. Arriva una volta al caricamento della
 * pagina, anche prima che React sia pronto: uno script inline lo trattiene
 * su `window` (INSTALL_PROMPT_CAPTURE), il provider lo prende da lì.
 */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const INSTALL_PROMPT_KEY = "__installPrompt";

export const INSTALL_PROMPT_CAPTURE = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.${INSTALL_PROMPT_KEY}=e;});`;

export function takeCapturedPrompt(): BeforeInstallPromptEvent | null {
  const holder = window as unknown as Record<string, unknown>;
  const event = holder[INSTALL_PROMPT_KEY] as
    BeforeInstallPromptEvent | undefined;
  return event ?? null;
}

/** La guida si apre da sola una volta per dispositivo: poi dal banner o dal profilo. */
const DISMISSED_KEY = "install-guide-dismissed";

export function isInstallGuideDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // storage non disponibile: non riproporla a ogni pagina
    return true;
  }
}

export function dismissInstallGuide() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // navigazione privata: la guida resta comunque raggiungibile dal profilo
  }
}

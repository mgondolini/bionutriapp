/**
 * Endpoint della sottoscrizione Web Push di questo browser, se esiste.
 * Nella fase 7 non c'è ancora un service worker: il risultato è null. Dalla
 * fase 8 l'uscita lo invia al server, che elimina la sottoscrizione.
 */
export async function currentPushEndpoint(): Promise<string | null> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return null;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}

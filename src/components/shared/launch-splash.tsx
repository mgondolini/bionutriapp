import { getPublicStudio } from "@/server/services/studio.service";

/** Durata minima e massima della schermata (ms): resta finché l'icona non è caricata. */
const MIN_MS = 1200;
const MAX_MS = 2500;
const FADE_MS = 300;
const SEEN_KEY = "launch-splash";

/*
 * Stili inline (non da globals.css): la schermata deve essere corretta anche
 * se il foglio di stile non è ancora arrivato. Cerchio al centro esatto come
 * quello di sistema, nome subito sotto.
 */
const LAUNCH_SPLASH_STYLE = `.launch-splash{display:none}.launch-splash-on .launch-splash{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:var(--background,#f8f7f4);transition:opacity ${FADE_MS}ms ease}.launch-splash-out .launch-splash{opacity:0}.launch-splash img{width:min(240px,60vw);height:auto;aspect-ratio:1;border-radius:9999px}.launch-splash p{position:absolute;left:16px;right:16px;top:calc(50% + min(120px,30vw) + 20px);margin:0;text-align:center;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:var(--foreground,#1f3a34);font-family:var(--font-jakarta),system-ui,sans-serif}@media (prefers-reduced-motion:reduce){.launch-splash-on .launch-splash{transition:none}}`;

/*
 * Solo all'apertura dall'icona installata (display-mode standalone, nessun
 * referrer) e una volta per sessione della finestra. Non su iPhone
 * (`navigator.standalone`): lì c'è già l'immagine di avvio con il nome
 * (`appleWebApp.startupImage`). Gira prima che React sia pronto.
 */
const LAUNCH_SPLASH_SCRIPT = `(function(){try{var d=document.documentElement;if(!matchMedia("(display-mode: standalone)").matches||navigator.standalone||document.referrer||sessionStorage.getItem("${SEEN_KEY}"))return;sessionStorage.setItem("${SEEN_KEY}","1");d.classList.add("launch-splash-on");var start=Date.now(),done=false;function hide(){if(done)return;done=true;setTimeout(function(){d.classList.add("launch-splash-out");setTimeout(function(){d.classList.remove("launch-splash-on","launch-splash-out")},${FADE_MS})},Math.max(0,${MIN_MS}-(Date.now()-start)))}var img=document.querySelector(".launch-splash img");if(!img||img.complete)hide();else{img.addEventListener("load",hide);img.addEventListener("error",hide)}setTimeout(hide,${MAX_MS});}catch(e){}})();`;

/**
 * Schermata di avvio con logo e nome dello studio per Android: dalla
 * versione 12 il sistema mostra solo l'icona (il manifest non ha un campo
 * per il testo), quindi il nome compare qui subito dopo. Nascosta finché lo
 * script non aggiunge `launch-splash-on` a `<html>`.
 */
export async function LaunchSplash() {
  const studio = await getPublicStudio();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LAUNCH_SPLASH_STYLE }} />
      <div aria-hidden="true" className="launch-splash">
        {/* icona maskable del manifest, nel cerchio e alla dimensione della
            schermata di sistema di Android: il passaggio non si nota */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon/maskable" alt="" width={240} height={240} />
        <p>{studio.name}</p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: LAUNCH_SPLASH_SCRIPT }} />
    </>
  );
}

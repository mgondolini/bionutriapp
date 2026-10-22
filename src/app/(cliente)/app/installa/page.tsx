import { InstallGuide } from "@/features/cliente/pwa/install-guide";
import { requireClient } from "@/server/services/session.service";

/**
 * Guida all'installazione della PWA (C-06, C3): al primo accesso da telefono,
 * dal banner su iPhone e dal profilo. Il contenuto dipende dal dispositivo,
 * quindi lo decide il browser.
 */
export default async function InstallPage() {
  await requireClient();
  return <InstallGuide />;
}

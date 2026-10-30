import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { InstallGuide } from "@/features/cliente/pwa/install-guide";
import { requireClient } from "@/server/services/session.service";

/** La sessione è un dato della richiesta: dietro Suspense (Cache Components). */
async function ClientInstallGuide() {
  await requireClient();
  return <InstallGuide />;
}

/**
 * Guida all'installazione della PWA (C-06, C3): al primo accesso da telefono,
 * dal banner su iPhone e dal profilo. Il contenuto dipende dal dispositivo,
 * quindi lo decide il browser.
 */
export default function InstallPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ClientInstallGuide />
    </Suspense>
  );
}

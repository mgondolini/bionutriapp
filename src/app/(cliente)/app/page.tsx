import { ClientHomeHeader } from "@/features/cliente/client-header";
import { LatestFile } from "@/features/cliente/files/latest-file";
import { OtherCurrentFiles } from "@/features/cliente/files/other-current-files";
import { OnboardingHome } from "@/features/cliente/onboarding-home";
import { InstallGuideAutoOpen } from "@/features/cliente/pwa/install-guide";
import { PushBanner } from "@/features/cliente/pwa/push-banner";
import { ToRecord } from "@/features/cliente/tracking/to-record";
import {
  HomeVideos,
  OnboardingVideos,
} from "@/features/cliente/videos/home-videos";
import { getClientHomeFiles } from "@/server/services/files.service";
import { listOwnEndpoints } from "@/server/services/push.service";
import { requireClient } from "@/server/services/session.service";
import {
  clientTrackingActor,
  getHomeToRecord,
} from "@/server/services/tracking.service";
import {
  getClientVideoHome,
  getOnboardingVideos,
} from "@/server/services/videos.service";

/**
 * Home del cliente: in Onboarding il benvenuto con i prossimi passi (C-09),
 * poi l'ultimo file pubblicato e le misure da registrare (C-02). In sola
 * lettura (In pausa, Concluso) il riepilogo delle misure non compare.
 * In entrambi i casi il banner delle notifiche (C-03) e, al primo accesso da
 * telefono, la guida all'installazione (C-06). I video (mockup v4): l'ultimo
 * aggiunto in home (C5), quelli di benvenuto in Onboarding (C4).
 */
export default async function ClientHomePage() {
  const session = await requireClient();
  const { client, studio } = session;
  const endpoints = await listOwnEndpoints();
  const pwa = (
    <>
      <InstallGuideAutoOpen />
      <PushBanner registeredEndpoints={endpoints} />
    </>
  );
  if (!client.unlocked) {
    return (
      <div className="flex flex-col gap-4">
        <ClientHomeHeader />
        {pwa}
        <OnboardingHome
          studioName={studio.name}
          videos={<OnboardingVideos videos={await getOnboardingVideos()} />}
        />
      </div>
    );
  }
  const actor = clientTrackingActor(session);
  const [files, toRecord, videos] = await Promise.all([
    getClientHomeFiles(client.id),
    actor?.canWrite ? getHomeToRecord(actor) : null,
    getClientVideoHome(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <ClientHomeHeader />
      {pwa}
      <LatestFile file={files.latest} />
      <OtherCurrentFiles files={files.others} />
      <HomeVideos home={videos} />
      {toRecord ? <ToRecord items={toRecord} /> : null}
    </div>
  );
}

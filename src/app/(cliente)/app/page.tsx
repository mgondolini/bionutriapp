import { ClientHomeHeader } from "@/features/cliente/client-header";
import { LatestFile } from "@/features/cliente/files/latest-file";
import { JourneyHomeRow } from "@/features/cliente/journeys/journey-home-row";
import { OtherCurrentFiles } from "@/features/cliente/files/other-current-files";
import { OnboardingHome } from "@/features/cliente/onboarding-home";
import { PrepHomeCard } from "@/features/cliente/onboarding-prep/prep-home-card";
import { PhotoHomeCard } from "@/features/cliente/photos/photos-page";
import { InstallGuideAutoOpen } from "@/features/cliente/pwa/install-guide";
import { PushBanner } from "@/features/cliente/pwa/push-banner";
import { ToRecord } from "@/features/cliente/tracking/to-record";
import {
  HomeVideos,
  OnboardingVideos,
} from "@/features/cliente/videos/home-videos";
import { getClientHomeFiles } from "@/server/services/files.service";
import { getClientJourneyHome } from "@/server/services/journeys.service";
import { callWhenText } from "@/lib/onboarding-prep/labels";
import { getOwnPrep } from "@/server/services/onboarding-prep.service";
import { getClientOpenPhotoSets } from "@/server/services/photos.service";
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
    // Preparazione della chiamata (v1.0.11, C4): card e data della chiamata
    const [prep, onboardingVideos] = await Promise.all([
      studio.id ? getOwnPrep(studio.id) : null,
      getOnboardingVideos(),
    ]);
    return (
      <div className="flex flex-col gap-4">
        <ClientHomeHeader />
        {pwa}
        <OnboardingHome
          studioName={studio.name}
          prep={prep ? <PrepHomeCard prep={prep} /> : null}
          callWhen={
            prep?.call ? callWhenText(prep.call.date, prep.call.time) : null
          }
          videos={<OnboardingVideos videos={onboardingVideos} />}
        />
      </div>
    );
  }
  const actor = clientTrackingActor(session);
  const [files, toRecord, videos, journey, openPhotoSets] = await Promise.all([
    getClientHomeFiles(client.id),
    actor?.canWrite ? getHomeToRecord(actor) : null,
    getClientVideoHome(),
    getClientJourneyHome(),
    actor?.canWrite ? getClientOpenPhotoSets(client.id) : [],
  ]);
  return (
    <div className="flex flex-col gap-4">
      <ClientHomeHeader />
      {pwa}
      {journey ? <JourneyHomeRow journey={journey} /> : null}
      {openPhotoSets[0] ? <PhotoHomeCard set={openPhotoSets[0]} /> : null}
      <LatestFile file={files.latest} />
      <OtherCurrentFiles files={files.others} />
      <HomeVideos home={videos} />
      {toRecord ? <ToRecord items={toRecord} /> : null}
    </div>
  );
}

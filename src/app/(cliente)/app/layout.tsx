import { Suspense } from "react";

import { BfcacheGuard } from "@/components/shared/bfcache-guard";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/shared/skip-link";
import { PageLoading } from "@/components/shared/page-states";
import { PwaProvider } from "@/features/cliente/pwa/pwa-provider";
import {
  ClientShellProvider,
  type ClientMenuItem,
} from "@/features/cliente/client-header";
import { CLIENT_NAV, ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { initialsOf } from "@/lib/studio/branding";
import { requireClient } from "@/server/services/session.service";
import { getClientOpenPhotoSets } from "@/server/services/photos.service";
import { getClientVideoHome } from "@/server/services/videos.service";

/**
 * Secondo livello di controllo (DEV-03b): solo clienti attivi. In Onboarding
 * le voci bloccate non compaiono (C-09); le pagine lo verificano a loro volta.
 * La voce Video porta il numero dei video nuovi (mockup v4, C6), la voce
 * Foto i set da caricare (v1.0.9).
 */
async function ClientShell({ children }: { children: React.ReactNode }) {
  const { studio, client } = await requireClient();
  const [videos, openPhotoSets] = await Promise.all([
    getClientVideoHome(),
    client.unlocked ? getClientOpenPhotoSets(client.id) : [],
  ]);
  const sections: ClientMenuItem[] = CLIENT_NAV.filter(
    (item) =>
      client.unlocked ||
      // in Onboarding la voce Video c'è solo se lo studio ha video di
      // benvenuto; la voce Foto no: le foto di partenza si caricano da
      // "Prepara la chiamata" (v1.0.11, C28)
      (!item.locked &&
        (item.key !== "videos" || videos.videoCount > 0) &&
        item.key !== "photos"),
  ).map((item) => ({
    key: item.key,
    href: item.href,
    ...copy.client.nav[item.key],
    badge:
      item.key === "videos" && videos.newCount > 0
        ? copy.client.videos.newCount(videos.newCount)
        : item.key === "photos" && openPhotoSets.length > 0
          ? copy.photos.client.menuBadge(openPhotoSets.length)
          : undefined,
    badgeAttention: item.key === "photos",
  }));

  return (
    <ClientShellProvider
      value={{
        studioName: studio.name,
        greeting: copy.client.greeting(client.firstName),
        initials: initialsOf(client.firstName, client.lastName),
        sections,
        profile: {
          key: "profile",
          href: ROUTES.client.profile,
          ...copy.client.profile,
        },
      }}
    >
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto w-full max-w-2xl flex-1 px-5 pt-5 pb-8"
      >
        {children}
      </main>
    </ClientShellProvider>
  );
}

export default function ClientLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SkipLink />
      <BfcacheGuard />
      <PwaProvider>
        <Suspense fallback={<PageLoading />}>
          <ClientShell>{children}</ClientShell>
        </Suspense>
      </PwaProvider>
    </div>
  );
}

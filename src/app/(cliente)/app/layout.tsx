import { Suspense } from "react";

import { MAIN_CONTENT_ID, SkipLink } from "@/components/shared/skip-link";
import { PageLoading } from "@/components/shared/page-states";
import {
  ClientHeader,
  type ClientMenuItem,
} from "@/features/cliente/client-header";
import { CLIENT_NAV, ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { initialsOf } from "@/lib/studio/branding";
import { requireClient } from "@/server/services/session.service";

/**
 * Secondo livello di controllo (DEV-03b): solo clienti attivi. In Onboarding
 * le voci bloccate non compaiono (C-09); le pagine lo verificano a loro volta.
 */
async function ClientShell({ children }: { children: React.ReactNode }) {
  const { studio, client } = await requireClient();
  const sections: ClientMenuItem[] = CLIENT_NAV.filter(
    (item) => client.unlocked || !item.locked,
  ).map((item) => ({
    key: item.key,
    href: item.href,
    ...copy.client.nav[item.key],
  }));

  return (
    <>
      <ClientHeader
        studio={{ name: studio.name, logoUrl: studio.logoUrl }}
        greeting={copy.client.greeting(client.firstName)}
        initials={initialsOf(client.firstName, client.lastName)}
        sections={sections}
        profile={{
          key: "profile",
          href: ROUTES.client.profile,
          ...copy.client.profile,
        }}
      />
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-6"
      >
        {children}
      </main>
    </>
  );
}

export default function ClientLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SkipLink />
      <Suspense fallback={<PageLoading />}>
        <ClientShell>{children}</ClientShell>
      </Suspense>
    </div>
  );
}

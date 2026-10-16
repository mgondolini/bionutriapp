import { Suspense } from "react";

import { LogoutButton } from "@/components/shared/logout-button";
import { PageLoading } from "@/components/shared/page-states";
import { AuthCard } from "@/features/auth/auth-card";
import { copy } from "@/lib/copy/it";
import { requireDisabledClient } from "@/server/services/session.service";

/** La sessione è un dato della richiesta: dietro Suspense (Cache Components). */
async function SuspendedCard() {
  const session = await requireDisabledClient();
  return (
    <AuthCard
      title={copy.auth.suspended.title}
      description={copy.auth.suspended.description(session.studio.name)}
    >
      <LogoutButton />
    </AuthCard>
  );
}

/** Cliente con account disattivato dallo studio. */
export default function SuspendedPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SuspendedCard />
    </Suspense>
  );
}

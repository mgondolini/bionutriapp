import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { PrivacyNoticeContent } from "@/components/shared/privacy-notice";
import { StudioThemeStyle } from "@/components/shared/studio-theme-style";
import { StudioBrand } from "@/features/auth/studio-brand";
import { ClosePrivacyButton } from "@/features/pubblico/close-privacy-button";
import { copy } from "@/lib/copy/it";
import { resolveStudio } from "@/server/services/studio.service";

const t = copy.privacy;

export const metadata: Metadata = { title: t.metaTitle };

/** Lo studio (titolare del trattamento) dipende dalla sessione: dietro Suspense. */
async function PrivacyNotice() {
  const studio = await resolveStudio();
  return (
    <>
      <StudioThemeStyle primaryColor={studio.primaryColor} />
      <StudioBrand name={studio.name} logoUrl={studio.logoUrl} />
      <PrivacyNoticeContent studioName={studio.name} />
    </>
  );
}

/**
 * Informativa privacy (NF-06): pubblica, raggiungibile anche dal pannello
 * del modulo di attivazione. Si chiude con la X o con "Chiudi" (nell'app
 * installata non c'è il tasto Indietro del browser). La versione è salvata
 * con i consensi (PRIVACY_POLICY_VERSION).
 */
export default function PrivacyPage() {
  return (
    <>
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">
          {t.title}
        </h1>
        <ClosePrivacyButton variant="icon" />
      </header>
      <Suspense fallback={<PageLoading />}>
        <PrivacyNotice />
      </Suspense>
      <ClosePrivacyButton variant="button" />
    </>
  );
}

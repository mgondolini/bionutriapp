import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { StudioThemeStyle } from "@/components/shared/studio-theme-style";
import { StudioBrand } from "@/features/auth/studio-brand";
import { PRIVACY_POLICY_VERSION } from "@/lib/constants/domain";
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
      <article className="flex flex-col gap-8">
        {t.sections(studio.name).map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </>
  );
}

/**
 * Informativa privacy (NF-06): pubblica, collegata dalla pagina di
 * attivazione. Struttura e testi segnaposto da far verificare al consulente
 * privacy; la versione è salvata con i consensi (PRIVACY_POLICY_VERSION).
 */
export default function PrivacyPage() {
  return (
    <>
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border-2 border-warning-foreground bg-warning p-4 text-sm text-warning-foreground"
      >
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-bold">{t.reviewBanner}</p>
          <p>{t.reviewNote}</p>
        </div>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.version(PRIVACY_POLICY_VERSION)}
        </p>
      </header>
      <Suspense fallback={<PageLoading />}>
        <PrivacyNotice />
      </Suspense>
    </>
  );
}

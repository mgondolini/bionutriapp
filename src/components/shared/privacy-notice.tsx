import { TriangleAlert } from "lucide-react";

import { PRIVACY_POLICY_VERSION } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.privacy;

/**
 * Testo dell'informativa privacy (NF-06), lo stesso nella pagina /privacy e
 * nel pannello del modulo di attivazione. Finché `copy.privacy.draft` è vero
 * mostra l'avviso della bozza da far verificare.
 */
export function PrivacyNoticeContent({ studioName }: { studioName: string }) {
  return (
    <div className="flex flex-col gap-6">
      {t.draft ? (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border-2 border-warning-foreground bg-warning p-4 text-sm text-warning-foreground"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          />
          <div className="flex flex-col gap-1">
            <p className="font-bold">{t.reviewBanner}</p>
            <p>{t.reviewNote}</p>
          </div>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t.version(PRIVACY_POLICY_VERSION)}
      </p>
      {t.sections(studioName).map((section) => (
        <section key={section.title} className="flex flex-col gap-2.5">
          <h2 className="text-[17px] font-bold">{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

import { Lock } from "lucide-react";

import { savedParts } from "@/components/shared/photos/labels";
import { copy } from "@/lib/copy/it";
import type { PhotoSetView } from "@/server/services/photos.service";

const t = copy.onboardingPrep.admin;

/**
 * Banner della scheda Foto di un cliente in Onboarding (A27): le foto di
 * partenza sono arrivate prima della chiamata.
 */
export function StartPhotosBanner({
  set,
  firstName,
}: {
  set: PhotoSetView;
  firstName: string;
}) {
  if (set.state !== "saved" || !set.savedAt) return null;
  const saved = savedParts(set.savedAt);
  return (
    <p className="flex items-start gap-3 rounded-[20px] bg-mint p-4 text-sm leading-5">
      <Lock
        aria-hidden="true"
        strokeWidth={1.8}
        className="mt-0.5 size-4 shrink-0"
      />
      <span>
        <b>{t.photosBannerTitle}</b>{" "}
        {set.savedByRole === "studio"
          ? t.photosBannerStudio(saved.dayMonth, saved.time)
          : t.photosBanner(firstName, saved.dayMonth, saved.time)}
      </span>
    </p>
  );
}

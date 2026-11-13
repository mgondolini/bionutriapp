import {
  Activity,
  Camera,
  ChartColumn,
  Check,
  Clapperboard,
  Dumbbell,
  Lock,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type { ReactNode } from "react";

import { CLIENT_NAV, type ClientNavKey } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.client.home.onboarding;

const ICONS: Record<ClientNavKey, LucideIcon> = {
  diets: Utensils,
  workouts: Dumbbell,
  reports: ChartColumn,
  videos: Clapperboard,
  tracking: Activity,
  photos: Camera,
};

/**
 * Home del cliente in Onboarding (C-09, schermata C4): benvenuto, prossimi
 * passi e chiamata. Le sezioni restano bloccate fino a In percorso: qui sono
 * solo elencate, senza link (le pagine rifiutano comunque l'accesso).
 */
export function OnboardingHome({
  studioName,
  videos,
  prep,
  callWhen,
}: {
  studioName: string;
  /** "Intanto guarda" (mockup v4, C4), tra i passi e l'area bloccata. */
  videos?: ReactNode;
  /** Card "Prepara la chiamata" (v1.0.11, C4), sotto il benvenuto. */
  prep?: ReactNode;
  /** Data e ora della chiamata, al posto del segnaposto del secondo passo. */
  callWhen?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[18px] bg-mint p-5 text-mint-foreground">
        <p className="self-start rounded-full bg-mint-foreground px-2.5 py-1 text-[12.5px] leading-none font-bold text-mint">
          {t.welcome}
        </p>
        <h2 className="text-[21px] leading-tight font-bold tracking-tight">
          {t.title(studioName)}
        </h2>
        <p className="rounded-xl bg-white/60 px-3.5 py-3 text-sm leading-normal">
          {prep ? t.descriptionPrep(studioName) : t.description(studioName)}
        </p>
      </section>

      {prep}

      <section
        aria-labelledby="onboarding-steps"
        className="flex flex-col gap-3"
      >
        <h2 id="onboarding-steps" className="text-[17px] font-bold">
          {t.stepsTitle}
        </h2>
        <ol className="flex flex-col gap-3">
          {t.steps.map((step, index) => {
            const done = index === 0;
            return (
              <li
                key={step.title}
                className="flex items-center gap-3.5 rounded-[14px] border bg-card p-3.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-[30px] shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground text-background",
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-[14.5px] font-bold">
                    {step.title}
                    {done ? (
                      <span className="sr-only">{t.stepDone}</span>
                    ) : null}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {index === 1 && callWhen ? callWhen : step.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {videos}

      <section
        aria-labelledby="onboarding-area"
        className="flex flex-col gap-3"
      >
        <h2 id="onboarding-area" className="text-[17px] font-bold">
          {t.areaTitle}
        </h2>
        <ul className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card">
          {CLIENT_NAV.filter((item) => item.locked).map((item) => {
            const Icon = ICONS[item.key];
            return (
              <li
                key={item.key}
                className="flex min-h-15 items-center gap-3 px-4 py-3 text-muted-foreground"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className="text-[14.5px] font-semibold text-secondary-foreground">
                    {copy.client.nav[item.key].label}
                  </span>
                  <span className="text-[12.5px]">{t.locked}</span>
                </div>
                <Lock aria-hidden="true" className="size-4" />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

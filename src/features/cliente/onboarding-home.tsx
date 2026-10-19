import {
  Check,
  Dumbbell,
  FileText,
  LineChart,
  Lock,
  Salad,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { CLIENT_NAV, type ClientNavKey } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.client.home.onboarding;

const ICONS: Record<ClientNavKey, LucideIcon> = {
  diets: Salad,
  workouts: Dumbbell,
  reports: FileText,
  tracking: LineChart,
};

/**
 * Home del cliente in Onboarding (C-09, schermata C4): benvenuto, prossimi
 * passi e chiamata. Le sezioni restano bloccate fino a In percorso: qui sono
 * solo elencate, senza link (le pagine rifiutano comunque l'accesso).
 */
export function OnboardingHome({ studioName }: { studioName: string }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl bg-primary p-6 text-primary-foreground">
        <Sprout aria-hidden="true" className="size-8" />
        <p className="text-sm font-medium opacity-90">{t.welcome}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.title(studioName)}
        </h1>
        <p className="opacity-90">{t.description(studioName)}</p>
      </section>

      <section
        aria-labelledby="onboarding-steps"
        className="flex flex-col gap-3"
      >
        <h2 id="onboarding-steps" className="text-lg font-semibold">
          {t.stepsTitle}
        </h2>
        <ol className="flex flex-col gap-2">
          {t.steps.map((step, index) => {
            const done = index === 0;
            return (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {step.title}
                    {done ? (
                      <span className="sr-only">{t.stepDone}</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {step.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        aria-labelledby="onboarding-area"
        className="flex flex-col gap-3"
      >
        <h2 id="onboarding-area" className="text-lg font-semibold">
          {t.areaTitle}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CLIENT_NAV.map((item) => {
            const Icon = ICONS[item.key];
            return (
              <li
                key={item.key}
                className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-4 text-muted-foreground"
              >
                <Icon aria-hidden="true" className="size-5" />
                <div className="flex flex-1 flex-col">
                  <span className="font-medium text-foreground">
                    {copy.client.nav[item.key].label}
                  </span>
                  <span className="text-sm">{t.locked}</span>
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

"use client";

import {
  Download,
  Share,
  SquarePlus,
  Smartphone,
  BellRing,
  EllipsisVertical,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { installGuideKind, shouldAutoOpenInstallGuide } from "@/lib/pwa/device";
import { cn } from "@/lib/utils";

import { dismissInstallGuide, isInstallGuideDismissed } from "./install-prompt";
import { usePwa } from "./pwa-provider";

const t = copy.install;

const IOS_ICONS = [Share, SquarePlus, BellRing];
const ANDROID_ICONS = [EllipsisVertical, Download, BellRing];
/** Colori delle icone dei passaggi, come nel mockup C3. */
const STEP_TONES = [
  "bg-info text-info-foreground",
  "bg-primary-tint text-primary-ink",
  "bg-warning text-warning-foreground",
];

function Steps({
  steps,
  icons,
}: {
  steps: readonly { title: string; description: string }[];
  icons: readonly (typeof Share)[];
}) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const Icon = icons[index];
        return (
          <li
            key={step.title}
            className="flex items-center gap-3.5 rounded-[14px] border bg-card p-3.5"
          >
            <span
              aria-hidden="true"
              className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14.5px] font-bold">{step.title}</span>
              <span className="text-[13px] text-muted-foreground">
                {step.description}
              </span>
            </div>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                STEP_TONES[index % STEP_TONES.length],
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Guida all'installazione della PWA (C-06, schermata C3): passaggi di Safari
 * su iPhone, pulsante "Installa" su Android e Chrome (beforeinstallprompt),
 * istruzioni dal menu se il browser non offre la richiesta. Con l'app già
 * installata lo dice e basta. "Ho installato l'app" e "Più tardi" la
 * chiudono per questo dispositivo: si riapre dal profilo.
 */
export function InstallGuide() {
  const router = useRouter();
  const { device, canPrompt, promptInstall } = usePwa();
  const [tab, setTab] = useState<"ios" | "android" | null>(null);

  if (!device) return null;
  const kind = installGuideKind(device, { canPrompt });
  const activeTab = tab ?? (device.platform === "android" ? "android" : "ios");

  const close = () => {
    dismissInstallGuide();
    router.replace(ROUTES.client.home);
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") close();
  };

  return (
    <div className="flex flex-col gap-5 pt-3">
      <header className="flex flex-col items-center gap-2.5 text-center">
        <span className="mb-1.5 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Smartphone aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </header>

      {kind === "installed" ? (
        <p className="rounded-[14px] border bg-card p-4">
          {t.alreadyInstalled}
        </p>
      ) : null}

      {kind === "android-prompt" || kind === "desktop-prompt" ? (
        <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
          <h2 className="text-[15px] font-bold">{t.promptTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.promptDescription}</p>
          <Button onClick={install} className="self-start">
            <Download aria-hidden="true" />
            {t.promptAction}
          </Button>
        </section>
      ) : null}

      {kind === "desktop-manual" ? (
        <p className="rounded-[14px] border bg-card p-4 text-sm">
          {t.desktopManual}
        </p>
      ) : null}

      {kind === "ios-other-browser" ? (
        <p className="rounded-[14px] border bg-card p-4 text-sm">
          {t.iosOtherBrowser}
        </p>
      ) : null}

      {kind !== "installed" && kind !== "android-prompt" ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setTab(value as "ios" | "android")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="ios">{t.tabs.ios}</TabsTrigger>
            <TabsTrigger value="android">{t.tabs.android}</TabsTrigger>
          </TabsList>
          <TabsContent value="ios" className="pt-3">
            <Steps steps={t.ios} icons={IOS_ICONS} />
          </TabsContent>
          <TabsContent value="android" className="pt-3">
            <Steps steps={t.android} icons={ANDROID_ICONS} />
          </TabsContent>
        </Tabs>
      ) : null}

      <div className="flex flex-col gap-2">
        {kind === "installed" ? (
          <Button size="lg" onClick={close}>
            {t.back}
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={close}>
              {t.done}
            </Button>
            <Button
              variant="ghost"
              onClick={close}
              className="text-primary-ink hover:text-primary-ink"
            >
              {t.later}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Primo accesso da telefono (C-06): se l'app non è installata e la guida
 * non è mai stata mostrata su questo dispositivo, la home porta alla guida.
 */
export function InstallGuideAutoOpen() {
  const router = useRouter();
  const { device } = usePwa();
  useEffect(() => {
    if (!device) return;
    if (
      shouldAutoOpenInstallGuide(device, {
        dismissed: isInstallGuideDismissed(),
      })
    ) {
      // una sola volta per dispositivo, anche se il cliente esce dalla guida
      // senza toccare i pulsanti: poi si riapre dal banner o dal profilo
      dismissInstallGuide();
      router.replace(ROUTES.client.install);
    }
  }, [device, router]);
  return null;
}

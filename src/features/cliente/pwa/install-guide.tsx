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

import { dismissInstallGuide, isInstallGuideDismissed } from "./install-prompt";
import { usePwa } from "./pwa-provider";

const t = copy.install;

const IOS_ICONS = [Share, SquarePlus, BellRing];
const ANDROID_ICONS = [EllipsisVertical, Download, BellRing];

function Steps({
  steps,
  icons,
}: {
  steps: readonly { title: string; description: string }[];
  icons: readonly (typeof Share)[];
}) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, index) => {
        const Icon = icons[index];
        return (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-xl border bg-card p-4"
          >
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{step.title}</span>
              <span className="text-sm text-muted-foreground">
                {step.description}
              </span>
            </div>
            <Icon
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-primary"
            />
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground">{t.description}</p>
      </header>

      {kind === "installed" ? (
        <p className="rounded-xl border bg-card p-4">{t.alreadyInstalled}</p>
      ) : null}

      {kind === "android-prompt" || kind === "desktop-prompt" ? (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 className="font-semibold">{t.promptTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.promptDescription}</p>
          <Button onClick={install} className="self-start">
            <Download aria-hidden="true" />
            {t.promptAction}
          </Button>
        </section>
      ) : null}

      {kind === "desktop-manual" ? (
        <p className="rounded-xl border bg-card p-4 text-sm">
          {t.desktopManual}
        </p>
      ) : null}

      {kind === "ios-other-browser" ? (
        <p className="rounded-xl border bg-card p-4 text-sm">
          {t.iosOtherBrowser}
        </p>
      ) : null}

      {kind !== "installed" && kind !== "android-prompt" ? (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setTab(value as "ios" | "android")}
        >
          <TabsList>
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

      <div className="flex flex-col gap-2 sm:flex-row">
        {kind === "installed" ? (
          <Button onClick={close}>{t.back}</Button>
        ) : (
          <>
            <Button onClick={close}>{t.done}</Button>
            <Button variant="ghost" onClick={close}>
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

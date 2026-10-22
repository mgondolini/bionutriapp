"use client";

import { BellOff, BellRing, Smartphone } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

import { DeniedHelp } from "./denied-help";
import { usePush } from "./use-push";

const t = copy.push.banner;

/**
 * Banner delle notifiche nella home (C-03, C5), finché le push non sono
 * attive su questo dispositivo. Il permesso si chiede solo dal tocco su
 * "Attiva"; su iPhone senza app installata porta alla guida (C3); con il
 * permesso negato spiega come riattivarlo.
 */
export function PushBanner({
  registeredEndpoints,
}: {
  registeredEndpoints: readonly string[];
}) {
  const { state, device, enable, isPending } = usePush(registeredEndpoints);
  if (state === "loading" || state === "active" || state === "unsupported") {
    return null;
  }

  const Icon =
    state === "denied"
      ? BellOff
      : state === "needs-install"
        ? Smartphone
        : BellRing;
  const text =
    state === "denied"
      ? t.denied
      : state === "needs-install"
        ? t.install
        : t.ask;

  return (
    <section
      aria-labelledby="push-banner-title"
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-start"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="push-banner-title" className="font-semibold">
          {text.title}
        </h2>
        <p className="text-sm text-muted-foreground">{text.description}</p>
        {state === "denied" && device ? (
          <DeniedHelp platform={device.platform} />
        ) : null}
      </div>
      {state === "ask" ? (
        <Button
          onClick={enable}
          disabled={isPending}
          className="self-start sm:self-center"
        >
          {isPending ? t.ask.pending : t.ask.action}
        </Button>
      ) : null}
      {state === "needs-install" ? (
        <Button
          nativeButton={false}
          render={<Link href={ROUTES.client.install} />}
          className="self-start sm:self-center"
        >
          {t.install.action}
        </Button>
      ) : null}
    </section>
  );
}

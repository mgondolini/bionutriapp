"use client";

import { Smartphone } from "lucide-react";
import Link from "next/link";

import { ProfileSection } from "@/components/shared/profile-section";
import { Button } from "@/components/ui/button";
import { usePwa } from "@/features/cliente/pwa/pwa-provider";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.profile.install;

/** Riapre la guida all'installazione (C-06); con l'app già installata lo dice e basta. */
export function InstallCard() {
  const { device } = usePwa();
  const installed = device?.installed ?? false;
  return (
    <ProfileSection title={t.title}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Smartphone aria-hidden="true" className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {installed ? t.installed : t.description}
        </p>
        {installed ? null : (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={ROUTES.client.install} />}
          >
            {t.open}
          </Button>
        )}
      </div>
    </ProfileSection>
  );
}

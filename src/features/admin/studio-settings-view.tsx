import { FileText, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { StudioLogo } from "@/components/shared/studio-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.admin.settings;

type StudioSettingsViewProps = {
  studio: { name: string; primaryColor: string; logoUrl: string | null };
  supportEmail: string | null;
};

/** Valore in sola lettura con l'aspetto di un campo e il lucchetto (A12). */
function ReadOnlyValue({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-muted/50 px-3 text-sm",
        className,
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <Lock
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </div>
  );
}

/**
 * Anteprima dell'app del cliente. Usa le variabili del tema già impostate
 * dallo studio (StudioThemeStyle): mostra i colori così come sono.
 */
function ClientPreview({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border bg-background">
      <div className="flex items-center gap-3 bg-card px-4 py-3">
        <StudioLogo name={name} logoUrl={logoUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{name}</p>
          <p className="font-semibold">{t.previewGreeting}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-tint px-2 py-0.5 font-medium text-tint-foreground">
              {t.previewBadge}
            </span>
            <span className="text-muted-foreground">
              {copy.domain.fileCategory.diet}
            </span>
          </div>
          <p className="font-semibold">{t.previewFileTitle}</p>
          <span className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            <FileText className="size-4" />
            {t.previewButton}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Impostazioni dello studio in sola lettura (A-14, A12): nome, logo e colore
 * li gestisce la piattaforma; il titolare li vede e scrive all'assistenza.
 */
export function StudioSettingsView({
  studio,
  supportEmail,
}: StudioSettingsViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl bg-info p-4 text-sm text-info-foreground"
      >
        <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t.managedTitle}</p>
          {supportEmail ? (
            <p>
              {t.managedBody}
              {": "}
              <a
                href={`mailto:${supportEmail}`}
                className="font-medium underline underline-offset-2"
              >
                {supportEmail}
              </a>
            </p>
          ) : (
            <p>{t.managedNoEmail}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold">{t.identityTitle}</h2>
            </CardTitle>
            <CardDescription>{t.readOnly}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <dt className="text-sm font-medium">{t.nameLabel}</dt>
                <dd>
                  <ReadOnlyValue>{studio.name}</ReadOnlyValue>
                </dd>
              </div>
              <div className="flex flex-col gap-2">
                <dt className="text-sm font-medium">{t.logoLabel}</dt>
                <dd className="flex flex-wrap items-center gap-4">
                  <StudioLogo
                    name={studio.name}
                    logoUrl={studio.logoUrl}
                    size="lg"
                  />
                  {studio.logoUrl ? null : (
                    <span className="text-sm text-muted-foreground">
                      {t.logoNone}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-2">
                <dt className="text-sm font-medium">{t.colorLabel}</dt>
                <dd className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="size-11 shrink-0 rounded-xl border border-black/10 bg-primary"
                  />
                  <ReadOnlyValue className="w-40 font-mono uppercase">
                    {studio.primaryColor}
                  </ReadOnlyValue>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg font-semibold">{t.previewTitle}</h2>
            </CardTitle>
            <CardDescription>{t.previewDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientPreview name={studio.name} logoUrl={studio.logoUrl} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

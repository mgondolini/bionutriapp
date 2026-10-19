import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { StudioThemeStyle } from "@/components/shared/studio-theme-style";
import { AuthCard } from "@/features/auth/auth-card";
import { StudioBrand } from "@/features/auth/studio-brand";
import { ActivationForm } from "@/features/cliente/activation/activation-form";
import { InvalidActivationLink } from "@/features/cliente/activation/invalid-link";
import { ResetPasswordForm } from "@/features/cliente/activation/reset-password-form";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getActivationView } from "@/server/services/invites.service";
import { getStudioBySlug } from "@/server/services/studio.service";

const t = copy.activation;

/** Pagina personale: mai indicizzata, nessun Referer verso altri siti (header anche in next.config.ts). */
export const metadata: Metadata = {
  title: t.metaTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Attivazione dal link WhatsApp (C-08). Il token resta sul server: se ne
 * calcola l'hash e si cerca l'invito. Qualunque link non utilizzabile mostra
 * lo stesso messaggio generico.
 */
async function Activation({
  params,
}: Pick<PageProps<"/attiva/[token]">, "params">) {
  const { token } = await params;
  const view = await getActivationView(token);
  if (view.kind === "invalid") return <InvalidActivationLink />;

  const studio = await getStudioBySlug(view.studio.slug);
  const { client } = view;

  return (
    <>
      <StudioThemeStyle primaryColor={studio.primaryColor} />
      <StudioBrand name={studio.name} logoUrl={studio.logoUrl} />
      {view.kind === "reset" ? (
        <AuthCard
          title={t.resetTitle}
          description={t.resetIntro(client.firstName)}
        >
          <ResetPasswordForm token={token} />
        </AuthCard>
      ) : (
        <AuthCard
          title={t.title}
          description={
            view.kind === "imported"
              ? t.introImported(client.firstName)
              : t.introNew(studio.name)
          }
        >
          <div className="flex flex-col gap-6">
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              {t.verifiedPhone(formatPhone(client.phone))}
            </p>
            <ActivationForm
              token={token}
              initial={{
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                birthDate: client.birthDate,
              }}
            />
            <p className="text-center text-xs text-muted-foreground">
              {view.kind === "new"
                ? t.afterNew
                : t.validUntil(formatLongDate(view.expiresAt))}
            </p>
          </div>
        </AuthCard>
      )}
    </>
  );
}

export default function ActivationPage({
  params,
}: PageProps<"/attiva/[token]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Activation params={params} />
    </Suspense>
  );
}

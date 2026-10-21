import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { AuthCard } from "@/features/auth/auth-card";
import { ConfirmEmailForm } from "@/features/auth/confirm-email-form";
import { copy } from "@/lib/copy/it";

/** Il token arriva dall'URL: dato della richiesta, quindi dietro Suspense. */
async function ConfirmEmailWithToken({
  searchParams,
}: Pick<PageProps<"/conferma-email">, "searchParams">) {
  const { token_hash: tokenHash, type } = await searchParams;
  const validToken =
    typeof tokenHash === "string" && type === "email_change" ? tokenHash : null;
  return <ConfirmEmailForm tokenHash={validToken} />;
}

/** Arriva dal link dell'email di cambio indirizzo (template email_change). */
export default function ConfirmEmailPage({
  searchParams,
}: PageProps<"/conferma-email">) {
  return (
    <AuthCard
      title={copy.profile.confirmEmail.title}
      description={copy.profile.confirmEmail.description}
    >
      <Suspense fallback={<PageLoading />}>
        <ConfirmEmailWithToken searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

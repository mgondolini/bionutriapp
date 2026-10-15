import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { AuthCard } from "@/features/auth/auth-card";
import { NewPasswordForm } from "@/features/auth/new-password-form";
import { copy } from "@/lib/copy/it";

/** Il token arriva dall'URL: dato della richiesta, quindi dietro Suspense. */
async function NewPasswordFormWithToken({
  searchParams,
}: Pick<PageProps<"/nuova-password">, "searchParams">) {
  const { token_hash: tokenHash, type } = await searchParams;
  const validToken =
    typeof tokenHash === "string" && type === "recovery" ? tokenHash : null;
  return <NewPasswordForm tokenHash={validToken} />;
}

/** Arriva dal link dell'email di recupero (o dello script create-studio) con il token_hash. */
export default function NewPasswordPage({
  searchParams,
}: PageProps<"/nuova-password">) {
  return (
    <AuthCard
      title={copy.auth.newPassword.title}
      description={copy.auth.newPassword.description}
    >
      <Suspense fallback={<PageLoading />}>
        <NewPasswordFormWithToken searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

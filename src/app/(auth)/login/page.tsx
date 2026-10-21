import { Suspense } from "react";

import { FormMessage } from "@/components/shared/form-message";
import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";
import {
  LOGIN_REASON_PARAM,
  NEXT_PARAM,
  parseLoginReason,
} from "@/lib/auth/route-decision";
import { copy } from "@/lib/copy/it";

/**
 * Legge dall'URL il percorso di ritorno e il motivo ("Sei uscito dall'app",
 * "La sessione è scaduta"): dati della richiesta, quindi dietro Suspense.
 */
async function LoginFormWithNext({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = params[NEXT_PARAM];
  const reason = parseLoginReason(params[LOGIN_REASON_PARAM]);
  return (
    <div className="flex flex-col gap-4">
      {reason ? (
        <FormMessage tone="info">{copy.auth.login.reasons[reason]}</FormMessage>
      ) : null}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}

/** Unica pagina di login per titolare e clienti. */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard
      title={copy.auth.login.title}
      description={copy.auth.login.description}
    >
      <Suspense fallback={<LoginForm />}>
        <LoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

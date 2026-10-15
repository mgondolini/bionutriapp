import { Suspense } from "react";

import { AuthCard } from "@/features/auth/auth-card";
import { LoginForm } from "@/features/auth/login-form";
import { NEXT_PARAM } from "@/lib/auth/route-decision";
import { copy } from "@/lib/copy/it";

/** Legge il percorso di ritorno dall'URL: dato della richiesta, quindi dietro Suspense. */
async function LoginFormWithNext({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const next = (await searchParams)[NEXT_PARAM];
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
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

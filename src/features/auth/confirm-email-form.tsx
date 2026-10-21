"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { confirmEmailChangeAction } from "@/server/actions/profile.actions";

const t = copy.profile.confirmEmail;

const linkClassName =
  "inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary underline-offset-4 hover:underline";

type Outcome = "done" | "partial" | { error: string } | null;

/**
 * Conferma del nuovo indirizzo email (C-07): il token si verifica solo al
 * clic, così l'anteprima del link nei client di posta non lo consuma.
 */
export function ConfirmEmailForm({ tokenHash }: { tokenHash: string | null }) {
  const hydrated = useHydrated();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [isPending, startTransition] = useTransition();

  if (!tokenHash) {
    return <FormMessage tone="info">{t.missingLink}</FormMessage>;
  }

  if (outcome === "done" || outcome === "partial") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="info">
          {outcome === "done" ? t.done : t.partial}
        </FormMessage>
        {/* navigazione completa: il proxy porta all'area del ruolo o al login */}
        <a href={ROUTES.client.home} className={linkClassName}>
          {t.goToApp}
        </a>
      </div>
    );
  }

  const confirm = () => {
    startTransition(async () => {
      const result = await confirmEmailChangeAction({ tokenHash });
      setOutcome(
        result.ok
          ? result.data.completed
            ? "done"
            : "partial"
          : { error: result.error },
      );
    });
  };

  return (
    <form
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
      className="flex flex-col gap-4"
    >
      {outcome ? <FormMessage>{outcome.error}</FormMessage> : null}
      <Button
        type="submit"
        disabled={!hydrated || isPending}
        className="w-full"
      >
        {isPending ? t.submitting : t.submit}
      </Button>
      {outcome ? (
        <Link href={ROUTES.login} className={linkClassName}>
          {t.goToLogin}
        </Link>
      ) : null}
    </form>
  );
}

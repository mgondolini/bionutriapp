"use client";

import { Copy, Video } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { meetingLinkText } from "@/lib/domain/journeys/meeting";
import { useHydrated } from "@/lib/use-hydrated";
import {
  setClientMeetingAction,
  setSessionMeetingAction,
} from "@/server/actions/journeys.actions";
import {
  clientMeetingFormSchema,
  setSessionMeetingSchema,
} from "@/server/validation/journeys.schema";

const t = copy.journeys.admin.meeting;

/**
 * Blocco "Videochiamata" (A17): il link usato dalla sessione (suo o del
 * cliente, già scelto da resolveMeetingUrl) come link reale e "Copia link".
 */
export function MeetingLink({
  url,
  sessionOnly,
}: {
  url: string | null;
  sessionOnly: boolean;
}) {
  const ids = useId();
  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  };
  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-2 rounded-xl bg-card px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 id={`${ids}-title`} className="text-sm font-semibold">
          {t.title}
        </h4>
        {url && sessionOnly ? (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
            {t.sessionOnly}
          </span>
        ) : null}
      </div>
      {url ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 font-semibold whitespace-nowrap text-primary-ink underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Video aria-hidden="true" className="size-4 shrink-0" />
            {meetingLinkText(url)}
          </a>
          <Button type="button" variant="neutral" size="sm" onClick={copyLink}>
            <Copy aria-hidden="true" />
            {t.copy}
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-admin-muted">{t.none}</p>
      )}
    </section>
  );
}

/**
 * Campo "Link Google Meet di [nome]" (A17, A19): "Salva link" lo salva per il
 * cliente (tutti i suoi check); "Usa un link solo per questo check" lo salva
 * sulla sessione. Sta dentro il form della sessione, quindi i pulsanti non
 * inviano il form e Invio salva il link del cliente.
 */
export function MeetingField({
  sessionId,
  clientId,
  clientName,
  clientUrl,
  sessionUrl,
}: {
  sessionId: string;
  clientId: string;
  clientName: string;
  clientUrl: string | null;
  sessionUrl: string | null;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const [value, setValue] = useState(clientUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (
    action: () => ReturnType<typeof setClientMeetingAction>,
    message: string,
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(message);
    });
  };

  const saveClient = () => {
    const parsed = clientMeetingFormSchema.safeParse({ meetingUrl: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    run(
      () => setClientMeetingAction({ clientId, meetingUrl: value }),
      parsed.data.meetingUrl ? t.savedClient : t.removedClient,
    );
  };

  const saveSession = () => {
    const parsed = setSessionMeetingSchema.safeParse({
      sessionId,
      meetingUrl: value,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    run(
      () => setSessionMeetingAction({ sessionId, meetingUrl: value }),
      t.savedSession,
    );
  };

  const useClientLink = () =>
    run(
      () => setSessionMeetingAction({ sessionId, meetingUrl: null }),
      t.removedSession,
    );

  return (
    <div className="flex flex-col gap-2">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={`${ids}-url`}>
          {t.fieldLabel(clientName)}
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Input
            id={`${ids}-url`}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveClient();
              }
            }}
            placeholder={t.placeholder}
            disabled={isPending}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${ids}-hint`}
            className="min-w-0 flex-1 basis-56"
          />
          <Button
            type="button"
            variant="neutral"
            onClick={saveClient}
            disabled={!hydrated || isPending}
          >
            {t.saveClient}
          </Button>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <div className="flex flex-wrap gap-x-4">
        <Button
          type="button"
          variant="link"
          className="h-auto min-h-11 px-0"
          onClick={saveSession}
          disabled={!hydrated || isPending}
        >
          {t.useForSession}
        </Button>
        {sessionUrl ? (
          <Button
            type="button"
            variant="link"
            className="h-auto min-h-11 px-0"
            onClick={useClientLink}
            disabled={!hydrated || isPending}
          >
            {t.useClientLink(clientName)}
          </Button>
        ) : null}
      </div>
      <p id={`${ids}-hint`} className="text-[13px] text-admin-muted">
        {t.hint}
      </p>
      {clientUrl ? (
        <p className="rounded-xl bg-info px-4 py-3 text-[13px] text-info-foreground">
          {t.reuseWarning}
        </p>
      ) : (
        <p className="text-[13px] text-admin-muted">{t.missing(clientName)}</p>
      )}
    </div>
  );
}

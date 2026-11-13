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
import { setSessionMeetingAction } from "@/server/actions/journeys.actions";
import { setSessionMeetingSchema } from "@/server/validation/journeys.schema";

const t = copy.journeys.admin.meeting;

/**
 * Blocco "Videochiamata" (A17): il link del check come link reale e
 * "Copia link".
 */
export function MeetingLink({ url }: { url: string | null }) {
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
      <h4 id={`${ids}-title`} className="text-sm font-semibold">
        {t.title}
      </h4>
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
 * Campo "Link Google Meet di questo check" (A17, A19): un link per ogni
 * check, quello del Meet che Google Calendar crea con l'evento. Sta dentro il
 * form della sessione, quindi il pulsante non invia il form e Invio salva il
 * link; vuoto lo toglie.
 */
export function MeetingField({
  sessionId,
  sessionUrl,
}: {
  sessionId: string;
  sessionUrl: string | null;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const [value, setValue] = useState(sessionUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    const parsed = setSessionMeetingSchema.safeParse({
      sessionId,
      meetingUrl: value,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setSessionMeetingAction({
        sessionId,
        meetingUrl: value,
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(parsed.data.meetingUrl ? t.saved : t.removed);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={`${ids}-url`}>{t.fieldLabel}</FieldLabel>
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
                save();
              }
            }}
            placeholder={t.placeholder}
            disabled={isPending}
            aria-invalid={error ? true : undefined}
            aria-describedby={sessionUrl ? undefined : `${ids}-missing`}
            className="min-w-0 flex-1 basis-56"
          />
          <Button
            type="button"
            variant="neutral"
            onClick={save}
            disabled={!hydrated || isPending}
          >
            {t.save}
          </Button>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      {sessionUrl ? null : (
        <p id={`${ids}-missing`} className="text-[13px] text-admin-muted">
          {t.missing}
        </p>
      )}
    </div>
  );
}

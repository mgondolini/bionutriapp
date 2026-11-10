"use client";

import { FileUp, Upload } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { PagedList, usePagedItems } from "@/components/shared/paged-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  CREATION_STAGES,
  CSV_MAX_BYTES,
  CSV_PREVIEW_PAGE_SIZE,
  type CreationStage,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { CleanResult } from "@/lib/csv/clean-clients";
import { formatShortDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  confirmImportAction,
  previewImportAction,
} from "@/server/actions/clients.actions";

const t = copy.admin.clients.import;

const stageLabel = copy.domain.journeyStage;

const STEPS = ["upload", "preview", "confirm"] as const;
type Step = (typeof STEPS)[number];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <ol className="flex gap-2 text-xs font-medium">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={step === current ? "step" : undefined}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-full px-3 py-1.5",
            index <= currentIndex
              ? "bg-primary-tint font-semibold text-primary-ink"
              : "bg-muted text-muted-foreground",
          )}
        >
          <span aria-hidden="true">{index + 1}</span>
          {t.steps[step]}
        </li>
      ))}
    </ol>
  );
}

/** Anteprima: righe valide, righe con dati corretti e righe scartate con il motivo. */
function ImportPreview({
  result,
  stage,
}: {
  result: CleanResult;
  stage: CreationStage;
}) {
  const withWarnings = result.valid.filter((row) => row.warnings.length > 0);
  const valid = usePagedItems(result.valid, CSV_PREVIEW_PAGE_SIZE);
  return (
    <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col rounded-xl bg-background px-4 py-3.5">
          <dt className="order-2 text-[12.5px] text-muted-foreground">
            {t.summaryValidLabel}
          </dt>
          <dd className="order-1 text-2xl font-bold tracking-tight text-primary-ink">
            {result.valid.length}
          </dd>
        </div>
        <div className="flex flex-col rounded-xl bg-background px-4 py-3.5">
          <dt className="order-2 text-[12.5px] text-muted-foreground">
            {t.summaryDiscardedLabel}
          </dt>
          <dd className="order-1 text-2xl font-bold tracking-tight text-warning-foreground">
            {result.discarded.length}
          </dd>
        </div>
      </dl>

      {result.discarded.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.discardedTitle}</h3>
          <PagedList
            pageSize={CSV_PREVIEW_PAGE_SIZE}
            className="flex flex-col divide-y divide-muted rounded-xl border text-sm"
            items={result.discarded.map((row) => (
              <li
                key={row.line}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-3"
              >
                <span className="w-16 shrink-0 text-muted-foreground">
                  {t.columns.line} {row.line}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="rounded-full bg-warning px-2.5 py-1 text-xs leading-none font-semibold text-warning-foreground">
                  {t.discardReasons[row.reason]}
                  {row.duplicateOfLine
                    ? ` (${t.duplicateOf(row.duplicateOfLine)})`
                    : null}
                </span>
              </li>
            ))}
          />
        </section>
      ) : null}

      {withWarnings.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.warningsTitle}</h3>
          <PagedList
            pageSize={CSV_PREVIEW_PAGE_SIZE}
            className="flex flex-col divide-y divide-muted rounded-xl border text-sm"
            items={withWarnings.map((row) => (
              <li key={row.line} className="flex flex-wrap gap-x-3 px-3.5 py-3">
                <span className="w-16 shrink-0 text-muted-foreground">
                  {t.columns.line} {row.line}
                </span>
                <span className="min-w-0 flex-1">
                  {row.warnings.map((w) => t.warnings[w]).join("; ")}
                </span>
              </li>
            ))}
          />
        </section>
      ) : null}

      {result.valid.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.validTitle}</h3>
          <p className="text-xs text-muted-foreground">
            {t.validHint(stageLabel[stage])}
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-subtle text-left text-[12.5px] text-muted-foreground">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">
                    {t.columns.line}
                  </th>
                  <th className="px-3.5 py-3 font-semibold">
                    {t.columns.client}
                  </th>
                  <th className="px-3.5 py-3 font-semibold">
                    {t.columns.phone}
                  </th>
                  <th className="px-3.5 py-3 font-semibold">
                    {t.columns.email}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {valid.visible.map((row) => (
                  <tr key={row.line}>
                    <td className="px-3.5 py-3 text-muted-foreground">
                      {row.line}
                    </td>
                    <td className="px-3.5 py-3">
                      {[row.firstName, row.lastName].filter(Boolean).join(" ")}
                      {row.birthDate ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatShortDate(row.birthDate)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap tabular-nums">
                      {formatPhone(row.phone)}
                    </td>
                    <td className="px-3.5 py-3">{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {valid.controls}
        </section>
      ) : (
        <FormMessage>{t.noValidRows}</FormMessage>
      )}
    </div>
  );
}

/** Fase per tutte le righe del file: In percorso o Onboarding. */
function StagePicker({
  value,
  onChange,
}: {
  value: CreationStage;
  onChange: (stage: CreationStage) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[13px] font-semibold">{t.stageLabel}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {CREATION_STAGES.map((option) => (
          <label
            key={option}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-sm font-semibold transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              value === option
                ? "border-primary ring-3 ring-mint"
                : "hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name="csv-import-stage"
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="size-5 shrink-0 accent-(--primary)"
            />
            {stageLabel[option]}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t.stageHint}</p>
    </fieldset>
  );
}

/**
 * Import da CSV (A-05, schermata A3): file e fase, anteprima, conferma. Gli
 * inviti WhatsApp si mandano poi dalla riga di ogni cliente (N-01).
 */
export function ImportCsvDialog() {
  const fileId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [stage, setStage] = useState<CreationStage>("in_progress");
  const [result, setResult] = useState<CleanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setStep("upload");
    setFile(null);
    setStage("in_progress");
    setResult(null);
    setError(null);
  };

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const chooseFile = async (selected: File | undefined) => {
    setError(null);
    setFile(null);
    if (!selected) return;
    if (selected.size > CSV_MAX_BYTES) {
      setError(t.fileErrors.too_large);
      return;
    }
    try {
      setFile({ name: selected.name, text: await selected.text() });
    } catch {
      setError(t.readError);
    }
  };

  const analyze = () => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const response = await previewImportAction({ csv: file.text, stage });
      if (redirectIfSignedOut(response)) return;
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult(response.data);
      setStep("preview");
    });
  };

  const confirm = () => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const response = await confirmImportAction({ csv: file.text, stage });
      if (redirectIfSignedOut(response)) return;
      if (!response.ok) {
        setError(response.error);
        return;
      }
      toast.success(t.imported(response.data.imported));
      changeOpen(false);
    });
  };

  const validCount = result?.valid.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="neutral" />}>
        <FileUp aria-hidden="true" />
        {copy.admin.clients.actions.importCsv}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} />
        {error ? <FormMessage>{error}</FormMessage> : null}

        {step === "upload" ? (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">{t.fileLabel}</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id={fileId}
                type="file"
                accept=".csv,text/csv"
                className="peer sr-only"
                aria-describedby={`${fileId}-name`}
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
              <label
                htmlFor={fileId}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:bg-muted"
              >
                <Upload aria-hidden="true" className="size-4" />
                {t.chooseFile}
              </label>
              <span
                id={`${fileId}-name`}
                className="min-w-0 truncate text-sm text-muted-foreground"
              >
                {file?.name ?? t.noFile}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t.limits}</p>
            <div className="mt-3">
              <StagePicker value={stage} onChange={setStage} />
            </div>
          </div>
        ) : null}

        {step === "preview" && result ? (
          <ImportPreview result={result} stage={stage} />
        ) : null}

        {step === "confirm" && result ? (
          <p className="rounded-xl bg-primary-tint p-4 text-sm text-primary-ink">
            {t.summaryValid(validCount)}
            {" · "}
            {t.validHint(stageLabel[stage])}
          </p>
        ) : null}

        <DialogFooter>
          {step === "upload" ? (
            <Button
              type="button"
              onClick={analyze}
              disabled={!file || isPending}
            >
              {isPending ? t.analyzing : t.analyze}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  setStep(step === "confirm" ? "preview" : "upload")
                }
              >
                {t.back}
              </Button>
              {step === "preview" ? (
                <Button
                  type="button"
                  disabled={validCount === 0}
                  onClick={() => setStep("confirm")}
                >
                  {t.steps.confirm}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={confirm}
                  disabled={isPending || validCount === 0}
                >
                  {isPending ? t.importing : t.confirm(validCount)}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

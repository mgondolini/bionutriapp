"use client";

import { FileUp, Upload } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
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
import { CSV_MAX_BYTES } from "@/lib/constants/domain";
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
              ? "bg-primary text-primary-foreground"
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
function ImportPreview({ result }: { result: CleanResult }) {
  const withWarnings = result.valid.filter((row) => row.warnings.length > 0);
  return (
    <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
      <p className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-full bg-success px-3 py-1 text-success-foreground">
          {t.summaryValid(result.valid.length)}
        </span>
        <span className="rounded-full bg-warning px-3 py-1 text-warning-foreground">
          {t.summaryDiscarded(result.discarded.length)}
        </span>
      </p>

      {result.discarded.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.discardedTitle}</h3>
          <ul className="flex flex-col divide-y rounded-lg border text-sm">
            {result.discarded.map((row) => (
              <li
                key={row.line}
                className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2"
              >
                <span className="w-16 shrink-0 text-muted-foreground">
                  {t.columns.line} {row.line}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="font-medium text-destructive">
                  {t.discardReasons[row.reason]}
                  {row.duplicateOfLine
                    ? ` (${t.duplicateOf(row.duplicateOfLine)})`
                    : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {withWarnings.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.warningsTitle}</h3>
          <ul className="flex flex-col divide-y rounded-lg border text-sm">
            {withWarnings.map((row) => (
              <li key={row.line} className="flex flex-wrap gap-x-3 px-3 py-2">
                <span className="w-16 shrink-0 text-muted-foreground">
                  {t.columns.line} {row.line}
                </span>
                <span className="min-w-0 flex-1">
                  {row.warnings.map((w) => t.warnings[w]).join("; ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.valid.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.validTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.validHint}</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.columns.line}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.client}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.phone}</th>
                  <th className="px-3 py-2 font-medium">{t.columns.email}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.valid.map((row) => (
                  <tr key={row.line}>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.line}
                    </td>
                    <td className="px-3 py-2">
                      {[row.firstName, row.lastName].filter(Boolean).join(" ")}
                      {row.birthDate ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatShortDate(row.birthDate)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {formatPhone(row.phone)}
                    </td>
                    <td className="px-3 py-2">{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <FormMessage>{t.noValidRows}</FormMessage>
      )}
    </div>
  );
}

/** Import da CSV (A-05, schermata A3): file, anteprima, conferma. */
export function ImportCsvDialog() {
  const fileId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState<CleanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setStep("upload");
    setFile(null);
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
      const response = await previewImportAction({ csv: file.text });
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
      const response = await confirmImportAction({ csv: file.text });
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
      <DialogTrigger render={<Button variant="outline" />}>
        <FileUp aria-hidden="true" />
        {copy.admin.clients.actions.importCsv}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} />
        {error ? <FormMessage>{error}</FormMessage> : null}

        {step === "upload" ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t.fileLabel}</span>
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
          </div>
        ) : null}

        {step === "preview" && result ? (
          <ImportPreview result={result} />
        ) : null}

        {step === "confirm" && result ? (
          <p className="rounded-xl bg-muted p-4 text-sm">
            {t.summaryValid(validCount)}
            {" · "}
            {t.validHint}
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

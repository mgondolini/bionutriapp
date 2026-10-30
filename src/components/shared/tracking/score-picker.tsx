"use client";

import { cn } from "@/lib/utils";

type ScorePickerProps = {
  /** Nome del gruppo di radio (unico nella pagina). */
  name: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number) => void;
  /** Id dell'elemento che dà il nome al gruppo (domanda o etichetta). */
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * Voti con un tocco (T-06, T-09): radio native, quindi frecce della
 * tastiera e screen reader funzionano senza codice in più. Ogni pulsante è
 * di almeno 44 px (NF-09); da 1 a 10 su due righe, per l'uso con una mano.
 */
export function ScorePicker({
  name,
  min,
  max,
  value,
  onChange,
  labelledBy,
  describedBy,
  disabled,
  invalid,
}: ScorePickerProps) {
  const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="grid grid-cols-5 gap-2"
    >
      {scores.map((score) => {
        const checked = value === score;
        return (
          <label
            key={score}
            className={cn(
              "flex h-12 min-w-11 cursor-pointer items-center justify-center rounded-lg border text-base font-semibold transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted",
              invalid && !checked ? "border-destructive" : null,
              disabled ? "cursor-not-allowed opacity-60" : null,
            )}
          >
            <input
              type="radio"
              name={name}
              value={score}
              checked={checked}
              onChange={() => onChange(score)}
              disabled={disabled}
              className="sr-only"
            />
            {score}
          </label>
        );
      })}
    </div>
  );
}

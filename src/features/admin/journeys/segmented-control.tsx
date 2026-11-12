"use client";

import { cn } from "@/lib/utils";

/**
 * Controllo segmentato del Percorso (durata, stato della sessione): pulsanti
 * veri con `aria-pressed` in un gruppo con nome. Il segmento scelto è
 * Profondo con testo bianco, come nel mockup A17.
 */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex w-fit overflow-hidden rounded-xl border-[1.5px] border-admin-field bg-card",
        className,
      )}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-11 px-5 text-sm font-semibold whitespace-nowrap text-foreground transition-colors hover:bg-wash focus-visible:relative focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:bg-foreground aria-pressed:text-white",
            index > 0 && "border-l-[1.5px] border-admin-field",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

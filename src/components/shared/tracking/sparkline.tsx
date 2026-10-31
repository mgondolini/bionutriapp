import { cn } from "@/lib/utils";

const WIDTH = 160;
const HEIGHT = 40;
const PAD = 3;

/**
 * Andamento delle ultime registrazioni nelle card dello staff (A9): solo
 * decorativo (`aria-hidden`), i valori sono nel testo della card e nel
 * dettaglio della misura. Valori dal più vecchio al più recente.
 */
export function Sparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => ({
    x: PAD + (index * (WIDTH - PAD * 2)) / (values.length - 1),
    y: PAD + ((max - value) * (HEIGHT - PAD * 2)) / span,
  }));
  const last = points[points.length - 1];
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn("h-10 w-full overflow-visible text-primary", className)}
    >
      <polyline
        points={points.map(({ x, y }) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r={3} fill="currentColor" />
    </svg>
  );
}

/**
 * Barre dei voti (abitudini: un giorno per barra, `null` = giorno saltato;
 * allenamenti: una sessione per barra). Decorative come `Sparkline`.
 */
export function MiniBars({
  values,
  max,
  className,
}: {
  values: readonly (number | null)[];
  max: number;
  className?: string;
}) {
  if (values.every((value) => value === null)) return null;
  return (
    <div
      aria-hidden="true"
      className={cn("flex h-10 items-end gap-1", className)}
    >
      {values.map((value, index) => (
        <span
          key={index}
          className={cn(
            "flex-1 rounded-[3px]",
            value === null ? "h-0.5 bg-border" : "bg-primary",
          )}
          style={
            value === null
              ? undefined
              : { height: `${Math.max(15, (value / max) * 100)}%` }
          }
        />
      ))}
    </div>
  );
}

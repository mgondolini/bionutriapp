import {
  Activity,
  Dumbbell,
  Footprints,
  GlassWater,
  Moon,
  Ruler,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Icone lucide per il nome salvato in metrics.icon; le altre ricadono su Activity. */
const ICONS: Record<string, LucideIcon> = {
  ruler: Ruler,
  footprints: Footprints,
  moon: Moon,
  "glass-water": GlassWater,
  dumbbell: Dumbbell,
};

export function MetricIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Activity;
  return <Icon aria-hidden="true" className={cn("size-5", className)} />;
}

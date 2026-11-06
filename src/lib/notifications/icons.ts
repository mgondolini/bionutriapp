import {
  ClipboardCheck,
  Dumbbell,
  FileChartColumn,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import type { NotificationType } from "@/lib/constants/domain";

/**
 * Icona di ogni tipo di notifica: la stessa nell'interfaccia e nei badge di
 * Android (`scripts/notification-badges.tsx`). FileChartColumn è il nome
 * attuale di FileBarChart.
 */
export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  file_diet: Utensils,
  file_workout: Dumbbell,
  file_report: FileChartColumn,
  daily_checkin: ClipboardCheck,
};

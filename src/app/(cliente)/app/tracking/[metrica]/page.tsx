import { notFound, redirect } from "next/navigation";

import { MetricStatusBadge } from "@/components/shared/metric-card";
import { ClientMetricDetail } from "@/features/cliente/tracking/metric-detail";
import { TrackingHeader } from "@/features/cliente/tracking/tracking-header";
import { ROUTES } from "@/lib/constants/domain";
import { requireClient } from "@/server/services/session.service";
import {
  clientTrackingActor,
  getClientMetricDetail,
  metricLimits,
} from "@/server/services/tracking.service";
import { metricKeySchema } from "@/server/validation/tracking.schema";

/**
 * Dettaglio di una misura (C10, C11, C12, T-03): registrazione, andamento e
 * storico. La chiave della misura arriva dall'URL: non valida o sconosciuta → 404.
 */
export default async function MetricPage({
  params,
}: PageProps<"/app/tracking/[metrica]">) {
  const session = await requireClient({ unlocked: true });
  const actor = clientTrackingActor(session);
  if (!actor) redirect(ROUTES.client.home);

  const key = metricKeySchema.safeParse((await params).metrica);
  if (!key.success) notFound();
  const detail = await getClientMetricDetail(actor, key.data);
  if (!detail) notFound();

  const { item } = detail;
  const status =
    item.kind === "circumference" ? item.summary.schedule.status : null;
  return (
    <div className="flex flex-col gap-5">
      <TrackingHeader
        title={item.metric.name}
        badge={
          status && status !== "ok" ? (
            <MetricStatusBadge status={status} />
          ) : null
        }
      />
      <ClientMetricDetail
        item={item}
        limits={metricLimits(item.metric)}
        scale={detail.scale}
        today={detail.today}
        canWrite={detail.canWrite}
      />
    </div>
  );
}

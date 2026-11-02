import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MetricStatusBadge } from "@/components/shared/metric-card";
import { PageLoading } from "@/components/shared/page-states";
import { buttonVariants } from "@/components/ui/button";
import { HeightPill } from "@/features/admin/clients/tracking/height-pill";
import { StaffMetricDetail } from "@/features/admin/clients/tracking/staff-metric-detail";
import { clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { requireStaff } from "@/server/services/session.service";
import { getStaffMetricDetail } from "@/server/services/tracking.service";
import { clientIdSchema } from "@/server/validation/clients.schema";
import { metricKeySchema } from "@/server/validation/tracking.schema";

const t = copy.admin.clients.tracking.detail;

/** Dettaglio di una misura (A10, A11, A-13, A-15): consultazione, inserimento e correzioni. */
async function MetricContent({
  params,
}: Pick<PageProps<"/admin/clienti/[id]/tracking/[metrica]">, "params">) {
  const session = await requireStaff();
  const { id, metrica } = await params;
  const clientId = clientIdSchema.safeParse(id);
  const key = metricKeySchema.safeParse(metrica);
  if (!clientId.success || !key.success || !session.studio.id) notFound();
  const detail = await getStaffMetricDetail(
    session.studio.id,
    clientId.data,
    key.data,
  );
  if (!detail) notFound();

  const { item } = detail;
  const status =
    item.kind === "circumference" ? item.summary.schedule.status : null;
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-3.5">
        <Link
          href={clientDetailPath(clientId.data, "tracking")}
          aria-label={t.backAria}
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold">{item.metric.name}</h2>
            {status && status !== "ok" ? (
              <MetricStatusBadge status={status} />
            ) : null}
            {item.kind === "circumference" ? (
              <HeightPill clientId={clientId.data} heightCm={detail.heightCm} />
            ) : null}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {t.subtitle[item.kind]}
          </p>
        </div>
      </header>
      <StaffMetricDetail
        item={item}
        scale={detail.scale}
        today={detail.today}
        clientId={clientId.data}
        clientName={detail.clientName}
        viewer={detail.viewer}
      />
    </div>
  );
}

export default function StaffMetricPage({
  params,
}: PageProps<"/admin/clienti/[id]/tracking/[metrica]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <MetricContent params={params} />
    </Suspense>
  );
}

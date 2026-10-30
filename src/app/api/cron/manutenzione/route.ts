import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { runMaintenance } from "@/server/services/maintenance.service";

/**
 * Manutenzione giornaliera (fase 9), chiamata dalla GitHub Action
 * .github/workflows/manutenzione.yml. Unico Route Handler dell'app (DEV-05):
 * senza `Authorization: Bearer <CRON_SECRET>` risponde 401 e non fa nulla.
 * POST: mai in cache, mai prerenderizzato.
 */
export async function POST(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json(
      { ok: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const report = await runMaintenance();
  return Response.json(report, {
    status: report.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}

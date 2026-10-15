import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { getSession, homeForSession } from "@/server/services/session.service";

/** La radice porta all'area del ruolo (di solito lo fa già il proxy). */
async function RedirectToHome(): Promise<null> {
  redirect(homeForSession(await getSession()));
}

export default function RootPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToHome />
    </Suspense>
  );
}

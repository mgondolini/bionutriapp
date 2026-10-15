import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { AdminFrame, type AdminNavItem } from "@/features/admin/admin-frame";
import { ADMIN_NAV } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { requireStaff } from "@/server/services/session.service";

/**
 * Secondo livello di controllo (DEV-03b): verifica di nuovo il ruolo, anche se
 * il proxy è disattivato. Legge la sessione, quindi sta dietro un Suspense.
 */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  const items: AdminNavItem[] = ADMIN_NAV.filter(
    (item) => !item.ownerOnly || session.role === "owner",
  ).map((item) => ({
    key: item.key,
    href: item.href,
    label: copy.admin.nav[item.key],
  }));

  return (
    <AdminFrame
      studio={{ name: session.studio.name, logoUrl: session.studio.logoUrl }}
      user={{
        displayName: session.displayName,
        roleLabel: copy.domain.staffRole[session.role],
      }}
      items={items}
    >
      {children}
    </AdminFrame>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

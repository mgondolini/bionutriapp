import { LogoutButton } from "@/components/shared/logout-button";
import { copy } from "@/lib/copy/it";
import { AuthCard } from "@/features/auth/auth-card";
import { requireDisabledClient } from "@/server/services/session.service";

/** Cliente con account disattivato dallo studio. */
export default async function SuspendedPage() {
  const session = await requireDisabledClient();
  return (
    <AuthCard
      title={copy.auth.suspended.title}
      description={copy.auth.suspended.description(session.studio.name)}
    >
      <LogoutButton />
    </AuthCard>
  );
}

import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { EmailCard } from "@/components/shared/profile/email-card";
import { PasswordCard } from "@/components/shared/profile/password-card";
import { SessionCard } from "@/components/shared/profile/session-card";
import { StaffProfileForm } from "@/features/admin/profile/staff-profile-form";
import { copy } from "@/lib/copy/it";
import { getStaffProfile } from "@/server/services/profile.service";
import { requireStaff } from "@/server/services/session.service";

const t = copy.profile.staff;

/**
 * Profilo del professionista: nome, email con conferma, password e uscita.
 * Separato da Impostazioni studio (dati dello studio, solo titolare).
 */
export default async function StaffProfilePage() {
  const session = await requireStaff();
  if (!session.studio.id) notFound();
  const profile = await getStaffProfile(session.studio.id, session.userId);
  if (!profile) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      <StaffProfileForm
        initial={{
          title: profile.title,
          firstName: profile.firstName,
          lastName: profile.lastName,
        }}
      />
      <EmailCard email={profile.email} hint={copy.profile.email.staffHint} />
      <PasswordCard />
      <SessionCard />
    </div>
  );
}

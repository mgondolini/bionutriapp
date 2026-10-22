import { notFound } from "next/navigation";

import { EmailCard } from "@/components/shared/profile/email-card";
import { PasswordCard } from "@/components/shared/profile/password-card";
import { SessionCard } from "@/components/shared/profile/session-card";
import { InstallCard } from "@/features/cliente/profile/install-card";
import { PersonalDataCard } from "@/features/cliente/profile/personal-data-card";
import { ProfileHeader } from "@/features/cliente/profile/profile-header";
import { PushPreference } from "@/features/cliente/profile/push-preference";
import { copy } from "@/lib/copy/it";
import { initialsOf } from "@/lib/studio/branding";
import { getClientProfile } from "@/server/services/profile.service";
import { listOwnEndpoints } from "@/server/services/push.service";
import { requireClient } from "@/server/services/session.service";

/**
 * Profilo del cliente (C13, C-07): dati personali, email, password,
 * notifiche, installazione dell'app e uscita. Disponibile anche in Onboarding (nessun `unlocked`).
 */
export default async function ProfilePage() {
  const session = await requireClient();
  const [profile, endpoints] = await Promise.all([
    getClientProfile(session.client.id),
    listOwnEndpoints(),
  ]);
  if (!profile) notFound();

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader
        name={name}
        initials={initialsOf(profile.firstName, profile.lastName)}
        studioName={session.studio.name}
        activatedAt={profile.activatedAt}
      />
      <PersonalDataCard
        firstName={profile.firstName}
        lastName={profile.lastName}
        birthDate={profile.birthDate}
        phone={profile.phone}
      />
      <EmailCard email={profile.email} hint={copy.profile.email.clientHint} />
      <PasswordCard />
      <PushPreference registeredEndpoints={endpoints} />
      <InstallCard />
      <SessionCard />
    </div>
  );
}

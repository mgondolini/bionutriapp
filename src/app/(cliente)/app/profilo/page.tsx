import { notFound } from "next/navigation";

import { EmailCard } from "@/components/shared/profile/email-card";
import { PasswordCard } from "@/components/shared/profile/password-card";
import { SessionCard } from "@/components/shared/profile/session-card";
import { ClientPageHeader } from "@/features/cliente/client-header";
import { InstallCard } from "@/features/cliente/profile/install-card";
import { PersonalDataCard } from "@/features/cliente/profile/personal-data-card";
import { ProfileHeader } from "@/features/cliente/profile/profile-header";
import { PushPreference } from "@/features/cliente/profile/push-preference";
import { copy } from "@/lib/copy/it";
import { initialsOf } from "@/lib/studio/branding";
import { getOwnPreferences } from "@/server/services/notifications.service";
import { getClientProfile } from "@/server/services/profile.service";
import { listOwnEndpoints } from "@/server/services/push.service";
import { requireClient } from "@/server/services/session.service";

/**
 * Profilo del cliente (C13, C-07): dati personali, email, password,
 * notifiche, installazione dell'app e uscita. Disponibile anche in Onboarding (nessun `unlocked`).
 */
export default async function ProfilePage() {
  const session = await requireClient();
  const [profile, endpoints, preferences] = await Promise.all([
    getClientProfile(session.client.id),
    listOwnEndpoints(),
    getOwnPreferences(),
  ]);
  if (!profile) notFound();

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={copy.client.profile.label} />
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
        heightCm={profile.heightCm}
        phone={profile.phone}
      />
      <EmailCard email={profile.email} hint={copy.profile.email.clientHint} />
      <PasswordCard />
      <PushPreference
        registeredEndpoints={endpoints}
        preferences={preferences}
      />
      <InstallCard />
      <SessionCard />
    </div>
  );
}

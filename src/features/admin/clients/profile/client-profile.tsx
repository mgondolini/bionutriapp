import { PrepCard } from "@/features/admin/onboarding-prep/prep-card";
import type { ClientProfile as Profile } from "@/server/services/clients.service";
import type { PrepView } from "@/server/services/onboarding-prep.service";

import { AccountCard } from "./account-card";
import { ClientDataCard } from "./client-data-card";
import { InviteCard } from "./invite-card";
import { StageCard } from "./stage-card";
import { StageHistory } from "./stage-history";

/** Scheda Profilo (A4, A5, A6): dati e storico a sinistra, account, invito e fase a destra. */
export function ClientProfile({
  client,
  senderName,
  prep = null,
}: {
  client: Profile;
  senderName: string;
  /** Preparazione della chiamata (v1.0.11, A5): solo in Onboarding. */
  prep?: PrepView | null;
}) {
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ");
  // data dell'ultimo ingresso nella fase corrente (storico dal più recente)
  const stageSince =
    client.history.find((item) => item.to === client.journeyStage)?.changedAt ??
    null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <ClientDataCard key={client.id} client={client} />
        <StageHistory items={client.history} />
      </div>
      <div className="flex flex-col gap-6">
        <AccountCard client={client} name={name} />
        <InviteCard client={client} name={name} senderName={senderName} />
        {prep ? <PrepCard prep={prep} /> : null}
        <StageCard client={client} stageSince={stageSince} />
      </div>
    </div>
  );
}

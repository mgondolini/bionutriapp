import type { ClientProfile as Profile } from "@/server/services/clients.service";

import { AccountCard } from "./account-card";
import { ClientDataCard } from "./client-data-card";
import { InviteCard } from "./invite-card";
import { StageCard } from "./stage-card";
import { StageHistory } from "./stage-history";

/** Scheda Profilo (A4, A5, A6): dati e storico a sinistra, account, invito e fase a destra. */
export function ClientProfile({
  client,
  studioName,
}: {
  client: Profile;
  studioName: string;
}) {
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ");
  // data dell'ultimo ingresso nella fase corrente (storico dal più recente)
  const stageSince =
    client.history.find((item) => item.to === client.journeyStage)?.changedAt ??
    null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-6">
        <ClientDataCard key={client.id} client={client} />
        <StageHistory items={client.history} />
      </div>
      <div className="flex flex-col gap-6">
        <AccountCard client={client} name={name} />
        <InviteCard client={client} name={name} studioName={studioName} />
        <StageCard client={client} stageSince={stageSince} />
      </div>
    </div>
  );
}

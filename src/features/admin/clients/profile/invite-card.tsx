import { StatusBadge } from "@/components/shared/status-badge";
import { copy } from "@/lib/copy/it";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { ClientProfile } from "@/server/services/clients.service";

import { WhatsAppInviteButton } from "../whatsapp-invite-button";
import { ProfileItem, ProfileSection } from "./profile-section";

const t = copy.admin.clients.profile.invite;

/**
 * Invito su WhatsApp (A-07, N-01, N-02): ultimo invio, scadenza o utilizzo,
 * anteprima del messaggio (solo nome dello studio e link, N-05) e invio,
 * reinvio o nuovo link per chi ha già un account.
 */
export function InviteCard({
  client,
  name,
  studioName,
}: {
  client: ClientProfile;
  name: string;
  studioName: string;
}) {
  const status = client.accountStatus;
  const invite = client.lastInvite;

  if (status === "disabled") {
    return (
      <ProfileSection title={t.title}>
        <p className="text-sm text-muted-foreground">{t.disabledHint}</p>
      </ProfileSection>
    );
  }

  const isActive = status === "active";
  const label =
    status === "to_invite" ? t.send : isActive ? t.newLink : t.resend;
  const hint =
    status === "to_invite"
      ? t.sendHint
      : isActive
        ? t.newLinkHint
        : t.resendHint;

  return (
    <ProfileSection title={t.title}>
      {status === "invite_expired" && invite ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-warning/40 px-3 py-2 text-sm">
          <StatusBadge status="invite_expired" />
          <span>{t.expiredNotice(formatLongDate(invite.expiresAt))}</span>
        </div>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2">
        <ProfileItem label={t.lastSent}>
          {invite?.sentAt ? formatDateTime(invite.sentAt) : t.never}
        </ProfileItem>
        {isActive && invite?.usedAt ? (
          <ProfileItem label={t.usedAt}>
            {formatLongDate(invite.usedAt)}
          </ProfileItem>
        ) : invite && !isActive ? (
          <ProfileItem label={t.expiresAt}>
            {formatLongDate(invite.expiresAt)}
          </ProfileItem>
        ) : null}
        {!isActive ? (
          <ProfileItem label={t.link}>{t.linkInfo}</ProfileItem>
        ) : null}
      </dl>

      {!isActive ? (
        <figure className="flex flex-col gap-2">
          <figcaption className="text-xs font-medium text-muted-foreground">
            {t.previewTitle(formatPhone(client.phone))}
          </figcaption>
          <blockquote className="rounded-lg rounded-tl-none bg-success/30 px-3 py-2 text-sm">
            {copy.invites.whatsappMessage(studioName, t.previewLinkPlaceholder)}
          </blockquote>
          <span className="text-xs text-muted-foreground">{t.previewNote}</span>
        </figure>
      ) : null}

      <div className="flex flex-col gap-2">
        <WhatsAppInviteButton
          clientId={client.id}
          name={name}
          label={label}
          variant={isActive ? "outline" : "default"}
          className="self-start"
        />
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
    </ProfileSection>
  );
}

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";

const t = copy.profile.client;

/** Intestazione del profilo (C13): avatar, nome e "Cliente di … dal …". */
export function ProfileHeader({
  name,
  initials,
  studioName,
  activatedAt,
}: {
  name: string;
  initials: string;
  studioName: string;
  activatedAt: string | null;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <Avatar className="size-16">
        <AvatarFallback className="bg-primary-tint text-[22px] font-bold text-primary-ink">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="truncate text-xl font-bold tracking-tight">{name}</h2>
        <p className="text-[13px] text-muted-foreground">
          {activatedAt
            ? t.clientOf(studioName, formatLongDate(activatedAt))
            : t.clientOfNoDate(studioName)}
        </p>
      </div>
    </div>
  );
}

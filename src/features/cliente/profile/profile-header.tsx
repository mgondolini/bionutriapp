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
    <header className="flex items-center gap-4">
      <Avatar className="size-14">
        <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="truncate text-xl font-bold">{name}</h1>
        <p className="text-sm text-muted-foreground">
          {activatedAt
            ? t.clientOf(studioName, formatLongDate(activatedAt))
            : t.clientOfNoDate(studioName)}
        </p>
      </div>
    </header>
  );
}

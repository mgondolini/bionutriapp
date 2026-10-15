"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  ChevronDown,
  Dumbbell,
  FileText,
  LineChart,
  LogOut,
  Salad,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { StudioLogo } from "@/components/shared/studio-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES, type ClientNavKey } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth.actions";

export type ClientMenuItem = {
  key: ClientNavKey | "profile";
  href: string;
  label: string;
  description: string;
};

type ClientHeaderProps = {
  studio: { name: string; logoUrl: string | null };
  greeting: string;
  initials: string;
  /** Voci di sezione già filtrate sul server (in Onboarding sono vuote, C-09). */
  sections: ClientMenuItem[];
  profile: ClientMenuItem;
};

const ICONS: Record<ClientMenuItem["key"], LucideIcon> = {
  diets: Salad,
  workouts: Dumbbell,
  reports: FileText,
  tracking: LineChart,
  profile: UserRound,
};

const itemClassName =
  "group/dropdown-menu-item flex min-h-11 cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent";

function MenuLink({ item, active }: { item: ClientMenuItem; active: boolean }) {
  const Icon = ICONS[item.key];
  return (
    <MenuPrimitive.LinkItem
      closeOnClick
      render={
        <Link href={item.href} aria-current={active ? "page" : undefined} />
      }
      className={cn(itemClassName, active && "font-semibold")}
    >
      <Icon aria-hidden="true" className="size-5 text-primary" />
      <span className="flex flex-col">
        <span>{item.label}</span>
        <span className="text-xs text-muted-foreground">
          {item.description}
        </span>
      </span>
    </MenuPrimitive.LinkItem>
  );
}

/** Intestazione dell'area cliente (C-01, schermate C5/C6) con menu a tendina. */
export function ClientHeader({
  studio,
  greeting,
  initials,
  sections,
  profile,
}: ClientHeaderProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
        <Link
          href={ROUTES.client.home}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StudioLogo name={studio.name} logoUrl={studio.logoUrl} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-muted-foreground">
              {studio.name}
            </span>
            <span className="truncate font-semibold">{greeting}</span>
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={copy.client.openMenu}
            className="flex min-h-11 items-center gap-1 rounded-full p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Avatar>
              <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {sections.map((item) => (
              <MenuLink
                key={item.key}
                item={item}
                active={pathname.startsWith(item.href)}
              />
            ))}
            {sections.length > 0 ? <DropdownMenuSeparator /> : null}
            <MenuLink
              item={profile}
              active={pathname.startsWith(profile.href)}
            />
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => startTransition(() => logoutAction())}
              className={itemClassName}
            >
              <LogOut aria-hidden="true" className="size-5" />
              <span className="flex flex-col">
                <span>{copy.common.logout}</span>
                <span className="text-xs text-muted-foreground">
                  {copy.common.logoutDescription}
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

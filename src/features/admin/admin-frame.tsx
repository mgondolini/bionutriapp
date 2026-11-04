"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  ChevronsUpDown,
  LogOut,
  Menu,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { MAIN_CONTENT_ID, SkipLink } from "@/components/shared/skip-link";
import { StudioLogo } from "@/components/shared/studio-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { ROUTES, type AdminNavKey } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

export type AdminNavItem = { key: AdminNavKey; href: string; label: string };

type AdminFrameProps = {
  studio: { name: string; logoUrl: string | null };
  user: { displayName: string; roleLabel: string };
  items: AdminNavItem[];
  children: ReactNode;
};

const ICONS: Record<AdminNavKey, LucideIcon> = {
  clients: Users,
  settings: Settings,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const menuItemClassName =
  "flex min-h-11 cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent";

/** Menu utente in fondo alla sidebar (A1): Profilo ed Esci. */
function UserMenu({
  user,
  onNavigate,
}: {
  user: AdminFrameProps["user"];
  onNavigate?: () => void;
}) {
  const { signOut, isPending } = useSignOut();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-white/8 p-3.5 text-left text-primary-tint transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm leading-snug font-bold text-sidebar-foreground">
            {user.displayName}
          </span>
          <span className="text-[13px]">{user.roleLabel}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <MenuPrimitive.LinkItem
          closeOnClick
          render={<Link href={ROUTES.admin.profile} onClick={onNavigate} />}
          className={menuItemClassName}
        >
          <UserRound aria-hidden="true" className="size-4" />
          {copy.profile.staff.profileLink}
        </MenuPrimitive.LinkItem>
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => signOut("local")}
          className={menuItemClassName}
        >
          <LogOut aria-hidden="true" className="size-4" />
          {copy.common.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  studio,
  user,
  items,
  onNavigate,
}: Omit<AdminFrameProps, "children"> & { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-7 bg-sidebar px-5 py-7 text-sidebar-foreground">
      <div className="flex items-center gap-2.5">
        <StudioLogo
          name={studio.name}
          logoUrl={studio.logoUrl}
          size="sm"
          tone="mint"
        />
        <span className="text-[17px] leading-tight font-bold tracking-tight">
          {studio.name}
        </span>
      </div>

      <nav aria-label={copy.admin.navLabel} className="flex-1">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = ICONS[item.key];
            const active = isActive(pathname, item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-[10px] px-3.5 py-2 text-[15px] leading-tight transition-colors outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring",
                    active
                      ? "bg-sidebar-accent font-semibold text-mint"
                      : "text-primary-tint hover:bg-sidebar-accent",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div>
        <UserMenu user={user} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/**
 * Struttura dell'area admin (A1): sidebar fissa da 1024 px in su,
 * pannello apribile sotto (NF-08).
 */
export function AdminFrame({ studio, user, items, children }: AdminFrameProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-full flex-1">
      <SkipLink />
      <aside className="hidden w-[220px] shrink-0 bg-sidebar lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent studio={studio} user={user} items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 bg-sidebar px-4 py-2 text-sidebar-foreground lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.admin.openMenu}
                  className="hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-foreground"
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">{copy.admin.navLabel}</SheetTitle>
              <SidebarContent
                studio={studio}
                user={user}
                items={items}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <StudioLogo
            name={studio.name}
            logoUrl={studio.logoUrl}
            size="sm"
            tone="mint"
          />
          <span className="truncate font-semibold">{studio.name}</span>
        </header>

        <main
          id={MAIN_CONTENT_ID}
          className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

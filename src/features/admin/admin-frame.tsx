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
      <DropdownMenuTrigger
        aria-label={copy.profile.staff.openMenu(user.displayName)}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">
            {user.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {user.roleLabel}
          </span>
        </span>
        <ChevronsUpDown
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
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
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-3 px-2">
        <StudioLogo name={studio.name} logoUrl={studio.logoUrl} size="sm" />
        <span className="leading-tight font-semibold">{studio.name}</span>
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
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t pt-4">
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
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent studio={studio} user={user} items={items} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-sidebar px-4 py-2 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.admin.openMenu}
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">{copy.admin.navLabel}</SheetTitle>
              <SidebarContent
                studio={studio}
                user={user}
                items={items}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <StudioLogo name={studio.name} logoUrl={studio.logoUrl} size="sm" />
          <span className="truncate font-semibold">{studio.name}</span>
        </header>

        <main
          id={MAIN_CONTENT_ID}
          className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

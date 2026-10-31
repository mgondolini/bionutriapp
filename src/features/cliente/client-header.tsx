"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cva } from "class-variance-authority";
import {
  Activity,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  LogOut,
  Menu,
  UserRound,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  use,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { ROUTES, type ClientNavKey } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

export type ClientMenuItem = {
  key: ClientNavKey | "profile";
  href: string;
  label: string;
  description: string;
};

type ClientShell = {
  studioName: string;
  greeting: string;
  initials: string;
  /** Voci di sezione già filtrate sul server (in Onboarding sono vuote, C-09). */
  sections: ClientMenuItem[];
  profile: ClientMenuItem;
};

const ClientShellContext = createContext<ClientShell | null>(null);

/**
 * Dati dell'intestazione dell'area cliente, letti dal layout sul server:
 * ogni pagina rende la propria intestazione (home o pagina interna, C5/C7)
 * con il proprio titolo come `h1`.
 */
export function ClientShellProvider({
  value,
  children,
}: {
  value: ClientShell;
  children: ReactNode;
}) {
  return <ClientShellContext value={value}>{children}</ClientShellContext>;
}

function useClientShell(): ClientShell {
  const shell = use(ClientShellContext);
  if (!shell) throw new Error("ClientShellProvider mancante");
  return shell;
}

type TileTone = "primary" | "info" | "neutral" | "warning";

const tileVariants = cva(
  "flex size-10 shrink-0 items-center justify-center rounded-xl",
  {
    variants: {
      tone: {
        primary: "bg-primary-tint text-primary-ink",
        info: "bg-info text-info-foreground",
        neutral: "bg-muted text-secondary-foreground",
        warning: "bg-warning text-warning-foreground",
      } satisfies Record<TileTone, string>,
    },
  },
);

const ICONS: Record<
  ClientMenuItem["key"],
  { icon: LucideIcon; tone: TileTone }
> = {
  diets: { icon: Utensils, tone: "primary" },
  workouts: { icon: Dumbbell, tone: "info" },
  reports: { icon: ChartColumn, tone: "neutral" },
  tracking: { icon: Activity, tone: "warning" },
  profile: { icon: UserRound, tone: "neutral" },
};

const itemClassName =
  "flex min-h-15 cursor-default items-center gap-3 rounded-xl px-2.5 py-2 outline-hidden select-none focus:bg-muted data-highlighted:bg-muted";

function ItemText({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-[15px] font-bold">{label}</span>
      <span className="text-[12.5px] text-muted-foreground">{description}</span>
    </span>
  );
}

function MenuLink({ item, active }: { item: ClientMenuItem; active: boolean }) {
  const { icon: Icon, tone } = ICONS[item.key];
  return (
    <MenuPrimitive.LinkItem
      closeOnClick
      render={
        <Link href={item.href} aria-current={active ? "page" : undefined} />
      }
      className={itemClassName}
    >
      <span className={tileVariants({ tone })}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <ItemText label={item.label} description={item.description} />
      <ChevronRight
        aria-hidden="true"
        className="size-4 text-muted-foreground"
      />
    </MenuPrimitive.LinkItem>
  );
}

/**
 * Menu dell'area cliente (C6): pannello largo quanto l'intestazione, sotto di
 * essa, con lo sfondo oscurato.
 */
function ClientMenu({ anchor }: { anchor: RefObject<HTMLElement | null> }) {
  const { sections, profile } = useClientShell();
  const pathname = usePathname();
  const { signOut, isPending } = useSignOut();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "relative z-50 rounded-xl data-popup-open:w-auto data-popup-open:border-foreground data-popup-open:bg-foreground data-popup-open:px-3.5 data-popup-open:text-background data-popup-open:hover:bg-foreground",
        )}
      >
        {open ? (
          <>
            <X aria-hidden="true" />
            {copy.client.closeMenu}
          </>
        ) : (
          <>
            <Menu aria-hidden="true" />
            <span className="sr-only">{copy.client.openMenu}</span>
          </>
        )}
      </DropdownMenuTrigger>
      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-[rgba(24,33,29,.42)]"
        />
      ) : null}
      <DropdownMenuContent
        anchor={anchor}
        align="center"
        sideOffset={8}
        className="rounded-[18px] p-2 shadow-[0_14px_36px_rgba(0,0,0,.24)] ring-0"
      >
        {sections.map((item) => (
          <MenuLink
            key={item.key}
            item={item}
            active={pathname.startsWith(item.href)}
          />
        ))}
        {sections.length > 0 ? (
          <DropdownMenuSeparator className="mx-2 my-1 bg-muted" />
        ) : null}
        <MenuLink item={profile} active={pathname.startsWith(profile.href)} />
        <DropdownMenuItem
          disabled={isPending}
          onClick={() => signOut("local")}
          className={itemClassName}
        >
          <span className={tileVariants({ tone: "neutral" })}>
            <LogOut aria-hidden="true" className="size-5" />
          </span>
          <ItemText
            label={copy.common.logout}
            description={copy.common.logoutDescription}
          />
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Intestazione della home (C4, C5): nome dello studio, saluto, menu e iniziali. */
export function ClientHomeHeader() {
  const { studioName, greeting, initials } = useClientShell();
  const header = useRef<HTMLElement>(null);
  return (
    <header
      ref={header}
      className="flex items-center justify-between gap-3 pt-1 pb-1.5"
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-semibold text-muted-foreground">
          {studioName}
        </span>
        <h1 className="truncate text-[28px] leading-tight font-bold tracking-tight">
          {greeting}
        </h1>
      </div>
      <div className="flex items-center gap-2.5">
        <ClientMenu anchor={header} />
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[15px] font-bold text-primary-ink"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}

/**
 * Intestazione delle pagine interne (C7…C13): ritorno, titolo e menu.
 * Senza `backHref` torna alla home.
 */
export function ClientPageHeader({
  title,
  backHref = ROUTES.client.home,
  backLabel = copy.client.backHome,
  badge,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  badge?: ReactNode;
}) {
  const header = useRef<HTMLElement>(null);
  return (
    <header ref={header} className="flex items-center gap-3 pt-1 pb-0.5">
      <Link
        href={backHref}
        aria-label={backLabel}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "rounded-xl",
        )}
      >
        <ChevronLeft aria-hidden="true" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="text-[22px] leading-tight font-bold tracking-tight">
          {title}
        </h1>
        {badge}
      </div>
      <ClientMenu anchor={header} />
    </header>
  );
}

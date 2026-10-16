"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CLIENT_TABS, clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.admin.clients.detail;

/** Schede Profilo, File, Tracking come rotte figlie della scheda cliente. */
export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={t.tabsLabel} className="border-b">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {CLIENT_TABS.map((tab) => {
          const href = clientDetailPath(clientId, tab);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={tab}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.tabs[tab]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

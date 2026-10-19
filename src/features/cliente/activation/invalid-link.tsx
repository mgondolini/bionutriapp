import { LinkIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.activation;

/** Messaggio unico per ogni link non utilizzabile: non rivela il motivo. */
export function InvalidActivationLink() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center">
      <LinkIcon aria-hidden="true" className="size-8 text-muted-foreground" />
      <h1 className="text-xl font-bold">{t.invalidTitle}</h1>
      <p className="text-muted-foreground">{t.invalid}</p>
      <Link
        href={ROUTES.login}
        className={buttonVariants({ variant: "outline" })}
      >
        {t.goToLogin}
      </Link>
    </div>
  );
}

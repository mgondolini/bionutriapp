import { cva, type VariantProps } from "class-variance-authority";
import Image from "next/image";

import { copy } from "@/lib/copy/it";
import { initialsOf } from "@/lib/studio/branding";
import { cn } from "@/lib/utils";

const logoVariants = cva(
  "flex shrink-0 items-center justify-center overflow-hidden font-bold",
  {
    variants: {
      /** Fondo delle iniziali: il primario, oppure la menta sul menu laterale scuro. */
      tone: {
        primary: "bg-primary text-primary-foreground",
        mint: "bg-mint text-mint-foreground",
      },
      size: {
        sm: "size-9 rounded-[10px] text-sm",
        md: "size-11 rounded-xl text-base",
        lg: "size-16 rounded-2xl text-xl",
      },
    },
    defaultVariants: { size: "md", tone: "primary" },
  },
);

const PIXELS = { sm: 36, md: 44, lg: 64 } as const;

type StudioLogoProps = {
  name: string;
  logoUrl: string | null;
  className?: string;
} & VariantProps<typeof logoVariants>;

/** Logo dello studio, oppure le sue iniziali sul colore principale (o sulla menta). */
export function StudioLogo({
  name,
  logoUrl,
  size,
  tone,
  className,
}: StudioLogoProps) {
  const pixels = PIXELS[size ?? "md"];
  return (
    <span
      className={cn(
        logoVariants({ size, tone }),
        logoUrl && "bg-card",
        className,
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={copy.common.logoAlt(name)}
          width={pixels}
          height={pixels}
          unoptimized
          className="size-full object-contain"
        />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
    </span>
  );
}

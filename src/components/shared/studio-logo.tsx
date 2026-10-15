import { cva, type VariantProps } from "class-variance-authority";
import Image from "next/image";

import { copy } from "@/lib/copy/it";
import { initialsOf } from "@/lib/studio/branding";
import { cn } from "@/lib/utils";

const logoVariants = cva(
  "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary font-semibold text-primary-foreground",
  {
    variants: {
      size: {
        sm: "size-9 text-sm",
        md: "size-11 text-base",
        lg: "size-16 text-xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

const PIXELS = { sm: 36, md: 44, lg: 64 } as const;

type StudioLogoProps = {
  name: string;
  logoUrl: string | null;
  className?: string;
} & VariantProps<typeof logoVariants>;

/** Logo dello studio, oppure le sue iniziali sul colore principale. */
export function StudioLogo({
  name,
  logoUrl,
  size,
  className,
}: StudioLogoProps) {
  const pixels = PIXELS[size ?? "md"];
  return (
    <span
      className={cn(logoVariants({ size }), logoUrl && "bg-card", className)}
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

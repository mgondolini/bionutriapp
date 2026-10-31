import { StudioLogo } from "@/components/shared/studio-logo";

/** Logo e nome dello studio in cima alle pagine di autenticazione. */
export function StudioBrand({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  return (
    <div className="-mb-3 flex flex-col items-center gap-2.5 text-center">
      <StudioLogo name={name} logoUrl={logoUrl} size="md" className="size-13" />
      <p className="text-[13px] font-semibold text-muted-foreground">{name}</p>
    </div>
  );
}

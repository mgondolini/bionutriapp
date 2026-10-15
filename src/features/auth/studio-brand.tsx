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
    <div className="flex flex-col items-center gap-3 text-center">
      <StudioLogo name={name} logoUrl={logoUrl} size="lg" />
      <p className="text-lg font-semibold">{name}</p>
    </div>
  );
}

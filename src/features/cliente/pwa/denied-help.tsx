import { copy } from "@/lib/copy/it";
import type { DevicePlatform } from "@/lib/pwa/device";

/** Come riattivare il permesso delle notifiche negato, per piattaforma. */
export function DeniedHelp({ platform }: { platform: DevicePlatform }) {
  return (
    <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      {copy.push.deniedHelp[platform].map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

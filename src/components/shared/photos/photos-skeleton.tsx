import { copy } from "@/lib/copy/it";

/** Caricamento della pagina (DEV-13): scheletri 3:4 al posto delle foto. */
export function PhotosSkeleton({ sets = 2 }: { sets?: number }) {
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">{copy.common.loading}</span>
      {Array.from({ length: sets }, (_, set) => (
        <div
          key={set}
          aria-hidden="true"
          className="flex flex-col gap-4 rounded-[20px] border border-admin-line bg-card p-5 sm:p-6"
        >
          <div className="h-6 w-40 animate-pulse rounded-full bg-admin-hover" />
          <div className="grid max-w-[632px] grid-cols-3 gap-3 sm:gap-4">
            {[0, 1, 2].map((view) => (
              <div
                key={view}
                className="aspect-[3/4] animate-pulse rounded-[14px] bg-admin-hover"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

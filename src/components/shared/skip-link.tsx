import { copy } from "@/lib/copy/it";

export const MAIN_CONTENT_ID = "contenuto";

/** Link "Vai al contenuto", visibile solo con la tastiera (NF-09). */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only z-50 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {copy.common.skipToContent}
    </a>
  );
}

import { MAIN_CONTENT_ID } from "@/components/shared/skip-link";

/** Pagine pubbliche di consultazione (informativa privacy), per tutti i ruoli. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="flex flex-1 justify-center px-4 py-10"
    >
      <div className="flex w-full max-w-2xl flex-col gap-8">{children}</div>
    </main>
  );
}

import { MAIN_CONTENT_ID } from "@/components/shared/skip-link";

/** Pagine pubbliche di attivazione: lo studio (logo, colore) è quello dell'invito, letto dalla pagina. */
export default function ActivationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center"
    >
      <div className="flex w-full max-w-md flex-col gap-6">{children}</div>
    </main>
  );
}

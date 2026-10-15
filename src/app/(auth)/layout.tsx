import { Suspense } from "react";

import { StudioBrand } from "@/features/auth/studio-brand";
import { resolveStudio } from "@/server/services/studio.service";

/** Studio della sessione (es. cliente sospeso) oppure quello delle pagine pubbliche. */
async function AuthStudioBrand() {
  const studio = await resolveStudio();
  return <StudioBrand name={studio.name} logoUrl={studio.logoUrl} />;
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Suspense fallback={<div className="h-28" aria-hidden="true" />}>
          <AuthStudioBrand />
        </Suspense>
        {children}
      </div>
    </main>
  );
}

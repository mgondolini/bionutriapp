import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";

import { StudioThemeStyle } from "@/components/shared/studio-theme-style";
import { Toaster } from "@/components/ui/sonner";
import { APP_BACKGROUND_COLOR } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  getPublicStudio,
  resolveStudio,
} from "@/server/services/studio.service";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

/**
 * Meta per l'app installata su iPhone (C-06): nome sotto l'icona della
 * schermata Home e barra di stato. L'icona `apple-touch-icon` arriva da
 * `apple-icon.tsx`. Studio del dominio, come manifest e icone.
 */
export async function generateMetadata(): Promise<Metadata> {
  const studio = await getPublicStudio();
  return {
    title: copy.app.fallbackName,
    description: copy.app.description,
    applicationName: studio.name,
    appleWebApp: {
      capable: true,
      title: studio.name,
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: APP_BACKGROUND_COLOR,
};

/** Tema dello studio: legge la sessione, quindi arriva in streaming dietro un Suspense. */
async function StudioTheme() {
  const studio = await resolveStudio();
  return <StudioThemeStyle primaryColor={studio.primaryColor} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <StudioTheme />
        </Suspense>
        {children}
        <Toaster theme="light" />
      </body>
    </html>
  );
}

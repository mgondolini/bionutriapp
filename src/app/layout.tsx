import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";

import { LaunchSplash } from "@/components/shared/launch-splash";
import { StudioThemeStyle } from "@/components/shared/studio-theme-style";
import { Toaster } from "@/components/ui/sonner";
import { APP_BACKGROUND_COLOR } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { SPLASH_SCREENS, splashMedia, splashPath } from "@/lib/pwa/splash";
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
    // nome dello studio nella scheda del browser; le pagine con un titolo
    // proprio (attivazione, privacy) lo mettono prima del nome
    title: { default: studio.name, template: `%s · ${studio.name}` },
    description: copy.app.description,
    applicationName: studio.name,
    appleWebApp: {
      capable: true,
      title: studio.name,
      statusBarStyle: "default",
      // schermata di avvio con logo e nome dello studio (Android la ricava dal manifest)
      startupImage: SPLASH_SCREENS.map((screen) => ({
        url: splashPath(screen),
        media: splashMedia(screen),
      })),
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
          <LaunchSplash />
        </Suspense>
        <Suspense fallback={null}>
          <StudioTheme />
        </Suspense>
        {children}
        <Toaster theme="light" />
      </body>
    </html>
  );
}

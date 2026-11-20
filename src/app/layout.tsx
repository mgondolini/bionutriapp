import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";

import { StudioThemeStyle } from "@/components/shared/studio-theme-style";
import { Toaster } from "@/components/ui/sonner";
import { INSTALL_PROMPT_CAPTURE } from "@/features/cliente/pwa/install-prompt";
import { APP_BACKGROUND_COLOR } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { STRIP_EXTENSION_ATTRIBUTES } from "@/lib/dev/extension-attributes";
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
    // "capable", barra di stato e schermata di avvio stanno nel <head>
    // statico del layout (vedi IosLaunchTags): questi metadati leggono lo
    // studio, quindi arrivano in streaming in fondo al <body>
    appleWebApp: { title: studio.name },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: APP_BACKGROUND_COLOR,
};

/**
 * Meta di iOS e schermate di avvio (C-06) nel <head> della pagina già
 * pronta, non nei metadati in streaming: i metadati che dipendono dalla
 * richiesta Next li aggiunge in fondo al <body>, e iOS all'installazione non
 * trovava le immagini (avvio su schermo nero). Gli indirizzi non dipendono
 * dallo studio: è la route /splash a disegnare logo e nome del dominio.
 */
function IosLaunchTags() {
  return (
    <>
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      {SPLASH_SCREENS.map((screen) => (
        <link
          key={splashPath(screen)}
          rel="apple-touch-startup-image"
          media={splashMedia(screen)}
          href={splashPath(screen)}
        />
      ))}
    </>
  );
}

/** Tema dello studio: legge la sessione, quindi arriva in streaming dietro un Suspense. */
async function StudioTheme() {
  const studio = await resolveStudio();
  return <StudioThemeStyle primaryColor={studio.primaryColor} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${jakarta.variable} h-full antialiased`}>
      <head>
        <IosLaunchTags />
      </head>
      <body className="flex min-h-full flex-col">
        {process.env.NODE_ENV === "development" ? (
          // attributi scritti da estensioni del browser: niente falsi errori di idratazione
          <script
            dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRIBUTES }}
          />
        ) : null}
        {/* trattiene l'evento di installazione anche prima dell'idratazione.
            Sta qui e non nel layout cliente: il layout radice arriva sempre
            dal server, mentre uno <script> reso in una navigazione nel
            browser (es. dopo il login) non viene eseguito e React lo segnala */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
        <Suspense fallback={null}>
          <StudioTheme />
        </Suspense>
        {children}
        <Toaster theme="light" />
      </body>
    </html>
  );
}

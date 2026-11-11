/*
 * Badge delle notifiche per Android (`pnpm notifications:badges`): un PNG
 * 96×96 per tipo, glifo bianco su fondo trasparente (Android usa solo il
 * canale alfa), dalle stesse icone lucide dell'interfaccia
 * (src/lib/notifications/icons.ts). Riproducibile: SVG da React e PNG con
 * Chromium di Playwright, nessuna dipendenza in più. Da rieseguire se cambia
 * un'icona; i file generati vanno nel repository.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";

import { NOTIFICATION_TYPES } from "../src/lib/constants/domain";
import { NOTIFICATION_ICONS } from "../src/lib/notifications/icons";

const SIZE = 96;
const OUT_DIR = join(process.cwd(), "public", "notification-badges");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: SIZE, height: SIZE },
      deviceScaleFactor: 1,
    });
    for (const type of NOTIFICATION_TYPES) {
      const Icon = NOTIFICATION_ICONS[type];
      // margine di 8 px: il glifo resta leggibile nel cerchio della barra di stato
      const svg = renderToStaticMarkup(
        <Icon size={SIZE - 16} color="#ffffff" strokeWidth={2.25} />,
      );
      await page.setContent(
        `<html><body style="margin:0;background:transparent;display:flex;align-items:center;justify-content:center;width:${SIZE}px;height:${SIZE}px">${svg}</body></html>`,
      );
      const png = await page.screenshot({ omitBackground: true });
      writeFileSync(join(OUT_DIR, `${type}.png`), png);
      console.info(`notification-badges/${type}.png`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

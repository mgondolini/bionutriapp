import { expect, test } from "@playwright/test";

import { SPLASH_SCREENS, splashPath } from "../src/lib/pwa/splash";

/*
 * Schermata di avvio su iPhone (C-06): i link apple-touch-startup-image e il
 * meta "capable" devono stare nel <head> dell'HTML che arriva dal server,
 * non nei metadati in streaming in fondo al <body> (iOS all'installazione
 * non li trovava e l'app si apriva su schermo nero).
 */
test("schermate di avvio iOS nel <head> e immagini disponibili", async ({
  request,
}) => {
  const html = await (await request.get("/login")).text();
  const head = html.slice(0, html.indexOf("</head>"));
  expect(head).toContain('name="apple-mobile-web-app-capable" content="yes"');
  for (const screen of SPLASH_SCREENS) {
    expect(head).toContain(`href="${splashPath(screen)}"`);
  }

  const image = await request.get(splashPath(SPLASH_SCREENS[0]!));
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toBe("image/png");
});

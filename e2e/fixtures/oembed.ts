import { createServer, type Server } from "node:http";

/**
 * oEmbed finto per e2e/videos.spec.ts: il server dell'app lo usa al posto di
 * YouTube (YOUTUBE_OEMBED_URL, impostata da playwright.config.ts). Risponde
 * come YouTube: 200 con titolo e canale, 401 non incorporabile, 404 altrimenti.
 */
export const E2E_OEMBED_PORT = 4599;
export const E2E_OEMBED_URL = `http://127.0.0.1:${E2E_OEMBED_PORT}/oembed`;

export const OEMBED_VIDEOS: Record<string, { title: string } | 401> = {
  e2eVideo001: { title: "Video di prova e2e" },
  e2eVideo002: { title: "Secondo video e2e" },
  e2eNoEmbed1: 401,
};

export function startOembedServer(): Promise<Server> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const watch = url.searchParams.get("url") ?? "";
    const id = new URL(watch, "https://www.youtube.com").searchParams.get("v");
    const video = id ? OEMBED_VIDEOS[id] : undefined;
    if (!video) {
      response.writeHead(404).end("Not Found");
      return;
    }
    if (video === 401) {
      response.writeHead(401).end("Unauthorized");
      return;
    }
    response
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify({ title: video.title, author_name: "Canale e2e" }));
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(E2E_OEMBED_PORT, "127.0.0.1", () => resolve(server));
  });
}

import { describe, expect, it } from "vitest";

import {
  oembedOutcome,
  parseYouTubeId,
  youtubeEmbedUrl,
  youtubeShortLabel,
} from "./youtube";

describe("parseYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=qX4r9Lp2aBc", "qX4r9Lp2aBc"],
    ["https://youtube.com/watch?v=qX4r9Lp2aBc&t=42s", "qX4r9Lp2aBc"],
    ["https://m.youtube.com/watch?v=qX4r9Lp2aBc", "qX4r9Lp2aBc"],
    ["https://youtu.be/qX4r9Lp2aBc", "qX4r9Lp2aBc"],
    ["youtu.be/qX4r9Lp2aBc?si=abc", "qX4r9Lp2aBc"],
    ["https://www.youtube.com/shorts/qX4r9Lp2aBc", "qX4r9Lp2aBc"],
    ["https://www.youtube.com/embed/qX4r9Lp2aBc", "qX4r9Lp2aBc"],
    ["  https://youtu.be/qX4r9Lp2aBc  ", "qX4r9Lp2aBc"],
  ])("riconosce %s", (input, id) => {
    expect(parseYouTubeId(input)).toBe(id);
  });

  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/watch?v=corto",
    "https://www.youtube.com/channel/UC123",
    "https://evil.example/watch?v=qX4r9Lp2aBc",
    "https://youtube.com.evil.example/watch?v=qX4r9Lp2aBc",
    "javascript:alert(1)",
    "",
  ])("rifiuta %s", (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});

describe("indirizzi", () => {
  it("link breve e player senza cookie", () => {
    expect(youtubeShortLabel("qX4r9Lp2aBc")).toBe("youtu.be/qX4r9Lp2aBc");
    expect(youtubeEmbedUrl("qX4r9Lp2aBc")).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/qX4r9Lp2aBc\?/,
    );
  });
});

describe("oembedOutcome", () => {
  it("200 riproducibile, 401 non incorporabile, 400/403/404 non disponibile", () => {
    expect(oembedOutcome(200)).toBe("ok");
    expect(oembedOutcome(401)).toBe("not_embeddable");
    for (const status of [400, 403, 404]) {
      expect(oembedOutcome(status)).toBe("unavailable");
    }
  });

  it("limiti e errori di YouTube: verifica da ripetere, il video non cambia stato", () => {
    for (const status of [429, 500, 503]) {
      expect(oembedOutcome(status)).toBe("check_failed");
    }
  });
});

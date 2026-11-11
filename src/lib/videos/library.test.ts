import { describe, expect, it } from "vitest";

import {
  buildFolderTree,
  isNewForClient,
  isRecentVideo,
  moveId,
} from "./library";

describe("buildFolderTree", () => {
  it("cartelle e sottocartelle nell'ordine dello studio", () => {
    const tree = buildFolderTree([
      { id: "b", parentId: null, sortOrder: 2 },
      { id: "a", parentId: null, sortOrder: 1 },
      { id: "a2", parentId: "a", sortOrder: 2 },
      { id: "a1", parentId: "a", sortOrder: 1 },
    ]);
    expect(tree.map((f) => [f.id, f.children.map((c) => c.id)])).toEqual([
      ["a", ["a1", "a2"]],
      ["b", []],
    ]);
  });
});

describe("video nuovi", () => {
  it("recente per 14 giorni, nuovo per il cliente finché non lo apre", () => {
    expect(isRecentVideo("2026-11-01T10:00:00Z", "2026-11-14")).toBe(true);
    expect(isRecentVideo("2026-10-31T10:00:00Z", "2026-11-14")).toBe(false);
    expect(
      isNewForClient(
        { createdAt: "2026-11-10T10:00:00Z", viewed: false },
        "2026-11-11",
      ),
    ).toBe(true);
    expect(
      isNewForClient(
        { createdAt: "2026-11-10T10:00:00Z", viewed: true },
        "2026-11-11",
      ),
    ).toBe(false);
  });
});

describe("moveId", () => {
  it("sposta di una posizione e resta uguale ai bordi", () => {
    expect(moveId(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b", "c"], "a", "up")).toEqual(["a", "b", "c"]);
    expect(moveId(["a", "b", "c"], "c", "down")).toEqual(["a", "b", "c"]);
  });
});

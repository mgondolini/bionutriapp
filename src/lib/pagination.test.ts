import { describe, expect, it } from "vitest";

import { paginate } from "./pagination";

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe("paginate", () => {
  it("restituisce la pagina richiesta con posizioni e totale", () => {
    expect(paginate(items, 2, 20)).toEqual({
      items: items.slice(20, 40),
      page: 2,
      pageCount: 3,
      total: 45,
      from: 21,
      to: 40,
    });
    const last = paginate(items, 3, 20);
    expect(last.items).toEqual([41, 42, 43, 44, 45]);
    expect([last.from, last.to]).toEqual([41, 45]);
  });

  it("riporta nell'intervallo le pagine non valide", () => {
    expect(paginate(items, 0, 20).page).toBe(1);
    expect(paginate(items, -3, 20).page).toBe(1);
    expect(paginate(items, 99, 20).page).toBe(3);
    expect(paginate(items, Number.NaN, 20).page).toBe(1);
    expect(paginate(items, 2.7, 20).page).toBe(2);
  });

  it("un elenco vuoto ha una sola pagina e nessuna posizione", () => {
    expect(paginate([], 4, 10)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      from: 0,
      to: 0,
    });
  });
});

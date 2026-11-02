import { describe, expect, it } from "vitest";

import { optionalHeight, parseHeight, requiredHeight } from "./height.schema";

describe("parseHeight", () => {
  it("accetta centimetri interi nei limiti, anche con l'unità", () => {
    expect(parseHeight("172")).toBe(172);
    expect(parseHeight(" 168 cm ")).toBe(168);
    expect(parseHeight("100")).toBe(100);
    expect(parseHeight("230")).toBe(230);
  });

  it("rifiuta decimali, metri e valori fuori dai limiti", () => {
    expect(parseHeight("1,72")).toBeNull();
    expect(parseHeight("172.5")).toBeNull();
    expect(parseHeight("99")).toBeNull();
    expect(parseHeight("231")).toBeNull();
    expect(parseHeight("abc")).toBeNull();
  });
});

describe("schemi dell'altezza", () => {
  it("obbligatoria: vuota non passa", () => {
    expect(requiredHeight.safeParse("").success).toBe(false);
    expect(requiredHeight.parse("175")).toBe(175);
  });

  it("facoltativa: vuota = null", () => {
    expect(optionalHeight.parse("")).toBeNull();
    expect(optionalHeight.parse("180")).toBe(180);
    expect(optionalHeight.safeParse("50").success).toBe(false);
  });
});

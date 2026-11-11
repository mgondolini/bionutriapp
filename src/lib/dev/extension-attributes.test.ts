import { describe, expect, it } from "vitest";

import { EXTENSION_ATTRIBUTE } from "./extension-attributes";

describe("EXTENSION_ATTRIBUTE", () => {
  it("riconosce solo gli attributi delle estensioni", () => {
    expect(EXTENSION_ATTRIBUTE.test("bis_skin_checked")).toBe(true);
    expect(EXTENSION_ATTRIBUTE.test("bis_register")).toBe(true);
    expect(
      EXTENSION_ATTRIBUTE.test(
        "__processed_4093f3f0-46c6-456e-9281-1858a1fad4e4__",
      ),
    ).toBe(true);
    expect(EXTENSION_ATTRIBUTE.test("class")).toBe(false);
    expect(EXTENSION_ATTRIBUTE.test("data-slot")).toBe(false);
    expect(EXTENSION_ATTRIBUTE.test("hidden")).toBe(false);
  });
});

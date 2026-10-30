import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "./authorize";

const SECRET = "a".repeat(64);

describe("isAuthorizedCronRequest", () => {
  it("accetta solo il segreto esatto nell'header Bearer", () => {
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedCronRequest(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest(null, SECRET)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", SECRET)).toBe(false);
  });

  it("rifiuta tutto se il segreto manca o è troppo corto", () => {
    expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer corto", "corto")).toBe(false);
  });
});

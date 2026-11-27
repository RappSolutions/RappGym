import { describe, expect, it } from "vitest";
import { clampOffset, cropRect } from "@/lib/avatar-crop";

describe("avatar crop", () => {
  it("centres a landscape image on its short side at zoom 1", () => {
    expect(cropRect(400, 200, 100, 1, 0, 0)).toEqual({ sx: 100, sy: 0, size: 200 });
  });
  it("never lets the image leave the viewport", () => {
    expect(clampOffset(400, 200, 100, 1, 999, 50)).toEqual({ x: 50, y: 0 });
    expect(cropRect(400, 200, 100, 1, 999, 0).sx).toBe(0);
  });
  it("zoom 2 halves the source square", () => {
    expect(cropRect(200, 200, 100, 2, 0, 0)).toEqual({ sx: 50, sy: 50, size: 100 });
  });
});

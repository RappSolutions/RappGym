
import { effortAtPosition } from "@/lib/effort";
describe("effortAtPosition", () => {
  it("maps band positions to zones 1–5 and clamps outside", () => {
    expect(effortAtPosition(-10, 0, 100)).toBe(1);
    expect(effortAtPosition(10, 0, 100)).toBe(1);
    expect(effortAtPosition(30, 0, 100)).toBe(2);
    expect(effortAtPosition(50, 0, 100)).toBe(3);
    expect(effortAtPosition(79, 0, 100)).toBe(4);
    expect(effortAtPosition(99, 0, 100)).toBe(5);
    expect(effortAtPosition(500, 0, 100)).toBe(5);
  });
});


import { EFFORT_LEVELS, effortAtPosition, effortPhrase, effortPhraseIndex } from "@/lib/effort";
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

describe("effortPhrase", () => {
  const phrases = ["one", "two", "three", "four", "five", "six", "seven"];

  it("keeps the same phrase for the same set and level", () => {
    for (const level of EFFORT_LEVELS) {
      const first = effortPhrase("workout-row:2", level, phrases, "fallback");
      expect(phrases).toContain(first);
      expect(effortPhrase("workout-row:2", level, phrases, "fallback")).toBe(first);
    }
  });

  it("uses every valid index and varies across sets", () => {
    const selected = new Set(EFFORT_LEVELS.flatMap((level) => Array.from({ length: 50 }, (_, seed) => effortPhraseIndex(`set-${seed}`, level, phrases.length))));
    expect([...selected].every((index) => index >= 0 && index < phrases.length)).toBe(true);
    expect(selected.size).toBeGreaterThan(1);
  });

  it("falls back when no phrases are available", () => {
    expect(effortPhrase("set", 3, [], "Moderate")).toBe("Moderate");
  });
});

import { describe, expect, it } from "vitest";
import { appendLoadAdvice, splitSuggestedLoad } from "@/lib/suggested-load";
import { suggestionRows } from "@/lib/workout-suggestions";

describe("suggested load", () => {
  it("separates the pictured 20 kg proposal from its advice", () => {
    expect(splitSuggestedLoad("20 kg eller lägre vid behov")).toEqual({ load: "20", advice: "20 kg eller lägre vid behov" });
    const row = suggestionRows([{ code: "TEST", sets: 2, reps: 15, load: "20 kg eller lägre vid behov", reason: "Bekant kombination" }], "2026-11-16", 6, "Test", null, "id")[0];
    expect(row?.load).toBe("20");
    expect(row?.note).toBe("Bekant kombination\n20 kg eller lägre vid behov");
  });
  it("does not invent numeric weights for ambiguous loads", () => {
    for (const load of ["15–20 kg", "Band 20", "Kroppsvikt", "Orange", "20 eller mindre"])
      expect(splitSuggestedLoad(load)).toEqual({ load, advice: "" });
  });
  it("keeps decimal weights and avoids duplicate advice", () => {
    expect(splitSuggestedLoad("12,5 kg")).toEqual({ load: "12.5", advice: "" });
    expect(appendLoadAdvice("20 kg eller lägre vid behov", "20 kg eller lägre vid behov")).toBe("20 kg eller lägre vid behov");
  });
});
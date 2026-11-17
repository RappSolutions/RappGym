import { describe, expect, it } from "vitest";
import { aiCostUsd, estimateUsage, DEFAULT_USAGE } from "@/lib/ai-cost";

describe("AI cost", () => {
  it("prices input and output tokens separately", () => {
    expect(aiCostUsd(1_000_000, 0)).toBe(1.25);
    expect(aiCostUsd(0, 1_000_000)).toBe(10);
  });
  it("estimates from earlier runs of the same mode only", () => {
    const past = [{ mode: "plan", inputTokens: 1000, outputTokens: 2000 }, { mode: "plan", inputTokens: 3000, outputTokens: 4000 }, { mode: "summary", inputTokens: 9, outputTokens: 9 }];
    expect(estimateUsage("plan", past)).toEqual({ input: 2000, output: 3000 });
  });
  it("falls back to defaults without history", () => {
    expect(estimateUsage("summary", [])).toEqual(DEFAULT_USAGE.summary);
  });
});

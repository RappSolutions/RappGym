import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { nextOrder, reorderRows } from "@/lib/workout-edit";

const rows = [{ id: "a", proposal_order: 0 }, { id: "b", proposal_order: 1 }, { id: "c", proposal_order: 2 }];
describe("workout editing", () => {
  it("moves a row down by swapping with the next", () => {
    expect(reorderRows(rows, "a", 1)).toEqual([{ id: "b", proposal_order: 0 }, { id: "a", proposal_order: 1 }]);
  });
  it("does nothing when moving the first row up", () => {
    expect(reorderRows(rows, "a", -1)).toEqual([]);
  });
  it("appends new exercises after the last one", () => {
    expect(nextOrder(rows)).toBe(3);
    expect(nextOrder([])).toBe(0);
  });
});

import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { placementFromFlat } from "./workout-edit";

const rows = [
  { id: "a", phase: "intro", proposal_order: 0 },
  { id: "b", phase: "main", proposal_order: 1 },
  { id: "c", phase: "main", proposal_order: 2 },
];

describe("placementFromFlat", () => {
  it("moves a row to another phase by dropping it under that header", () => {
    expect(placementFromFlat(["h:intro", "a", "h:main", "b", "h:outro", "c"], rows)).toEqual([{ id: "c", phase: "outro", proposal_order: 2 }]);
  });
  it("reorders within a phase and only updates changed rows", () => {
    expect(placementFromFlat(["h:intro", "a", "h:main", "c", "b", "h:outro"], rows)).toEqual([
      { id: "c", phase: "main", proposal_order: 1 },
      { id: "b", phase: "main", proposal_order: 2 },
    ]);
  });
});

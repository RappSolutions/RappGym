export const REPS_UNITS = ["reps", "sec", "min"] as const;
export type RepsUnit = (typeof REPS_UNITS)[number];

/** What the numeric reps value means for an exercise; unknown values fall back to plain reps. */
export function repsUnit(ex: { reps_unit?: string | null } | null | undefined): RepsUnit {
  const u = ex?.reps_unit;
  return u === "sec" || u === "min" ? u : "reps";
}

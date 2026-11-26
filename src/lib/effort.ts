/** Self-reported effort per completed set (RIR-based). Stored in log_entries.effort; NULL = not recorded. */
export const EFFORT_LEVELS = [1, 2, 3, 4, 5] as const;
export type Effort = (typeof EFFORT_LEVELS)[number];
export const DEFAULT_EFFORT: Effort = 3;
export function isEffort(v: unknown): v is Effort {
  return typeof v === "number" && (EFFORT_LEVELS as readonly number[]).includes(v);
}

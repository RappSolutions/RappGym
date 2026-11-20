import type { Tables } from "@/integrations/supabase/types";

/** `code` = exercise's current code (for lookups); `recorded_code` = code stored on the row,
 * frozen for completed rows so history shows what was actually done. */
export type LogRow = Tables<"log_entries"> & { recorded_code: string };

export function toLogEntry<T extends Tables<"log_entries">>({ ex, ...row }: T & { ex?: { code: string } | null }): Omit<T, "ex"> & { recorded_code: string } {
  return { ...row, recorded_code: row.code, code: ex?.code ?? row.code } as Omit<T, "ex"> & { recorded_code: string };
}

/** Name shown for a log row: the frozen snapshot, localized only while it still matches the current exercise name. */
export function loggedName(row: { exercise_name: string }, current: { name: string } | undefined, localized: { name: string } | undefined): string {
  if (current && localized && current.name === row.exercise_name) return localized.name;
  return row.exercise_name;
}

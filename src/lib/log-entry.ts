import type { Tables } from "@/integrations/supabase/types";

/** `code` = exercise's current code (for lookups); `recorded_code` = code stored on the row,
 * frozen for completed rows so history shows what was actually done. */
export type LogRow = Tables<"log_entries"> & { recorded_code: string };

export function toLogEntry<T extends Tables<"log_entries">>({ ex, ...row }: T & { ex?: { code: string } | null }): Omit<T, "ex"> & { recorded_code: string } {
  return { ...row, recorded_code: row.code, code: ex?.code ?? row.code } as Omit<T, "ex"> & { recorded_code: string };
}

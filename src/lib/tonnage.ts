import { weightKg } from "./progress";

type Row = { sets: number | null; reps: number | null; load: string; reps_unit?: string | null; status?: string; created_at?: string };

/** Lifted volume of one log row: sets × reps × kg. Time-based rows and non-numeric loads (bodyweight, band) count as 0. Derived, never stored. */
export function rowTonnage(r: Row): number {
  if ((r.reps_unit ?? "reps") !== "reps" || !r.reps || r.reps <= 0) return 0;
  const kg = weightKg(r.load);
  return kg && kg > 0 ? Math.max(1, r.sets ?? 1) * r.reps * kg : 0;
}

/** Summary of completed rows: total kg, sets, minutes between first and last recorded set, kg per minute. */
export function tonnageSummary(rows: readonly Row[]) {
  const done = rows.filter((r) => !r.status || r.status === "completed");
  const kg = done.reduce((n, r) => n + rowTonnage(r), 0);
  const sets = done.reduce((n, r) => n + Math.max(1, r.sets ?? 1), 0);
  const times = done.map((r) => (r.created_at ? Date.parse(r.created_at) : NaN)).filter(Number.isFinite);
  const minutes = times.length > 1 ? Math.round((Math.max(...times) - Math.min(...times)) / 60000) : 0;
  return { kg: Math.round(kg), sets, minutes, kgPerMin: minutes > 0 ? Math.round(kg / minutes) : null };
}

/** "850 kg" below one tonne, otherwise "14,2 t" (locale decimal). */
export function formatTonnage(kg: number, locale: string): string {
  return kg < 1000 ? `${kg.toLocaleString(locale)} kg` : `${(kg / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} t`;
}

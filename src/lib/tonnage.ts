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

type DatedRow = Row & { date: string; workout_id?: string | null };
const completed = <T extends Row>(rows: readonly T[]) => rows.filter((r) => !r.status || r.status === "completed");

/** Tonnage per ISO date (YYYY-MM-DD), ascending. */
export function tonnageByDay(rows: readonly DatedRow[]): { date: string; kg: number }[] {
  const m = new Map<string, number>();
  for (const r of completed(rows)) m.set(r.date, (m.get(r.date) ?? 0) + rowTonnage(r));
  return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([date, kg]) => ({ date, kg: Math.round(kg) }));
}

/** ISO 8601 week label "YYYY-Www" for an ISO date. */
export function isoWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Tonnage per ISO week, ascending. */
export function tonnageByWeek(rows: readonly DatedRow[]): { week: string; kg: number }[] {
  const m = new Map<string, number>();
  for (const r of completed(rows)) { const w = isoWeek(r.date); m.set(w, (m.get(w) ?? 0) + rowTonnage(r)); }
  return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([week, kg]) => ({ week, kg: Math.round(kg) }));
}

/** kg/min per workout (rows grouped by workout_id, else date); workouts without measurable duration are skipped. */
export function densityByWorkout(rows: readonly DatedRow[]): { date: string; kgPerMin: number }[] {
  const g = new Map<string, DatedRow[]>();
  for (const r of completed(rows)) { const k = r.workout_id ?? `day:${r.date}`; g.set(k, [...(g.get(k) ?? []), r]); }
  return [...g.values()]
    .map((rs) => ({ date: rs.map((r) => r.date).sort()[0]!, kgPerMin: tonnageSummary(rs).kgPerMin }))
    .filter((x): x is { date: string; kgPerMin: number } => x.kgPerMin !== null && x.kgPerMin > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

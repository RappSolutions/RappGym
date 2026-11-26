import { weightKg } from "./progress";
import { rowTonnage, tonnageSummary } from "./tonnage";

type Row = { workout_id: string | null; code: string; sets: number | null; reps: number | null; load: string; reps_unit?: string | null; status?: string; created_at: string; effort?: number | null };

export type WorkoutSummary = {
  kg: number; sets: number; reps: number; exercises: number; minutes: number; kgPerMin: number | null;
  avgEffort: number | null; effortCounts: [number, number, number, number, number];
  prs: { code: string; kg: number; previousKg: number }[];
  categories: { category: string; sets: number; kg: number }[];
};

/** Derived summary of one completed workout. A PR is a max kg above every earlier completed row of the same exercise; first-time exercises are not PRs. */
export function summarizeWorkout(workoutId: string, log: readonly Row[], categoryOf: (code: string) => string): WorkoutSummary {
  const done = log.filter((r) => r.workout_id === workoutId && (!r.status || r.status === "completed"));
  const base = tonnageSummary(done);
  const setsOf = (r: Row) => Math.max(1, r.sets ?? 1);
  const reps = done.reduce((n, r) => n + ((r.reps_unit ?? "reps") === "reps" ? setsOf(r) * (r.reps ?? 0) : 0), 0);
  const effortCounts: WorkoutSummary["effortCounts"] = [0, 0, 0, 0, 0];
  let effortSum = 0, effortN = 0;
  for (const r of done) if (r.effort && r.effort >= 1 && r.effort <= 5) { effortCounts[r.effort - 1]! += setsOf(r); effortSum += r.effort * setsOf(r); effortN += setsOf(r); }
  const first = done.reduce((m, r) => (r.created_at < m ? r.created_at : m), done[0]?.created_at ?? "");
  const prs: WorkoutSummary["prs"] = [];
  for (const code of new Set(done.map((r) => r.code))) {
    const kg = Math.max(0, ...done.filter((r) => r.code === code).map((r) => weightKg(r.load) ?? 0));
    const prev = log.filter((r) => r.code === code && r.workout_id !== workoutId && (!r.status || r.status === "completed") && r.created_at < first).map((r) => weightKg(r.load) ?? 0);
    const previousKg = prev.length ? Math.max(...prev) : 0;
    if (kg > 0 && previousKg > 0 && kg > previousKg) prs.push({ code, kg, previousKg });
  }
  const cats = new Map<string, { sets: number; kg: number }>();
  for (const r of done) { const c = categoryOf(r.code); const v = cats.get(c) ?? { sets: 0, kg: 0 }; cats.set(c, { sets: v.sets + setsOf(r), kg: v.kg + rowTonnage(r) }); }
  return {
    kg: base.kg, sets: base.sets, reps, exercises: new Set(done.map((r) => r.code)).size, minutes: base.minutes, kgPerMin: base.kgPerMin,
    avgEffort: effortN ? Math.round((effortSum / effortN) * 10) / 10 : null, effortCounts, prs,
    categories: [...cats].map(([category, v]) => ({ category, sets: v.sets, kg: Math.round(v.kg) })).sort((a, b) => b.sets - a.sets || a.category.localeCompare(b.category)),
  };
}

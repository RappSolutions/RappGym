import type { Exercise, LogEntry } from "@/lib/gym";

const DAY = 86_400_000;
const toDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);
/** Monday-based week index. 1970-01-01 was a Thursday. */
const weekOf = (day: number) => Math.floor((day + 3) / 7);

export function dashboardStats(log: LogEntry[], exercises: Exercise[], today: string) {
  const t = toDay(today);
  const dates = [...new Set(log.map((e) => e.date))].sort();
  const days = dates.map(toDay);
  const reps = (e: LogEntry) => (e.sets ?? 1) * (e.reps ?? 0);
  const last = dates.at(-1) ?? null;
  const weeks = new Set(days.map(weekOf));
  let streak = 0;
  let w = weekOf(t);
  if (!weeks.has(w)) w -= 1;
  while (weeks.has(w)) { streak++; w--; }
  const catOf = new Map(exercises.map((e) => [e.code, e.category]));
  const perCategory30 = new Map<string, number>();
  for (const e of log) {
    const d = toDay(e.date);
    if (d > t - 30 && d <= t) {
      const c = catOf.get(e.code) ?? "?";
      perCategory30.set(c, (perCategory30.get(c) ?? 0) + (e.sets ?? 1));
    }
  }
  return {
    workoutsThisWeek: days.filter((d) => weekOf(d) === weekOf(t)).length,
    workoutsLast28: days.filter((d) => d > t - 28 && d <= t).length,
    totalSets: log.reduce((s, e) => s + (e.sets ?? 1), 0),
    totalReps: log.reduce((s, e) => s + reps(e), 0),
    lastDate: last,
    daysSinceLast: last ? t - toDay(last) : null,
    weekStreak: streak,
    perCategory30,
    recentDates: dates.slice(-3).reverse(),
  };
}

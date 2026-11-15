import type { LogEntry } from "@/lib/gym";

/** Only explicit numeric loads (optionally kg) are comparable as weights. */
export function weightKg(load: string): number | null {
  const value = load.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?\s*(?:kg)?$/i.test(value)) return null;
  const weight = Number(value.replace(/\s*kg$/i, ""));
  return Number.isFinite(weight) ? weight : null;
}

export function progressByDay(log: LogEntry[], code?: string, since?: string) {
  const days = new Map<string, { date: string; sets: number; weight: number | null }>();
  for (const entry of log) {
    if ((code && entry.code !== code) || (since && entry.date < since)) continue;
    const day = days.get(entry.date) ?? { date: entry.date, sets: 0, weight: null };
    day.sets += Math.max(1, entry.sets ?? 1);
    const weight = weightKg(entry.load);
    if (weight !== null) day.weight = day.weight === null ? weight : Math.max(day.weight, weight);
    days.set(entry.date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function periodStart(today: string, days: number): string {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}
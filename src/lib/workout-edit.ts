import { supabase } from "@/integrations/supabase/client";
import type { PlannedRow } from "@/lib/gym";
import type { Phase } from "@/lib/circuit";

const PHASE_RANK: Record<string, number> = { intro: 0, main: 1, outro: 2 };
type Orderable = { id: string; proposal_order: number | null; phase?: string | null };
/** Display order: phase first, then proposal_order (NULLs keep their read order). */
export function orderedRows<T extends Orderable>(rows: readonly T[]): T[] {
  return rows.map((r, i) => ({ r, i })).sort((a, b) => (PHASE_RANK[a.r.phase ?? "main"] ?? 1) - (PHASE_RANK[b.r.phase ?? "main"] ?? 1) || (a.r.proposal_order ?? a.i) - (b.r.proposal_order ?? b.i) || a.i - b.i).map((x) => x.r);
}

/** Whether a row can move up (-1) or down (+1) within its own phase. */
export function canMove(rows: readonly Orderable[], id: string, dir: -1 | 1): boolean {
  const row = rows.find((r) => r.id === id);
  if (!row) return false;
  const same = orderedRows(rows).filter((r) => (r.phase ?? "main") === (row.phase ?? "main"));
  const i = same.findIndex((r) => r.id === id) + dir;
  return i >= 0 && i < same.length;
}

/** New proposal_order values after moving one row within its phase; returns only rows whose order changes. */
export function reorderRows(rows: readonly Orderable[], id: string, dir: -1 | 1): { id: string; proposal_order: number }[] {
  if (!canMove(rows, id, dir)) return [];
  const ordered = orderedRows(rows);
  const from = ordered.findIndex((r) => r.id === id);
  const to = from + dir;
  const moved = [...ordered];
  [moved[from], moved[to]] = [moved[to]!, moved[from]!];
  return moved.map((r, i) => ({ id: r.id, proposal_order: i, before: r.proposal_order })).filter((r) => r.before !== r.proposal_order).map(({ id, proposal_order }) => ({ id, proposal_order }));
}

/** Next order slot after all existing rows, also when older rows have no order yet. */
export function nextOrder(rows: readonly { proposal_order: number | null }[]): number {
  return rows.reduce((m, r) => Math.max(m, (r.proposal_order ?? -1) + 1), rows.length);
}

export type PlanItem = { code: string; sets: number; reps: number | null; load: string; note?: string | null; phase?: string | null };

/** Writes plan items to workout_exercises, resolving exercise codes to FK ids; unknown codes fail loudly. */
export async function insertPlannedExercises(workoutId: string, items: readonly PlanItem[], startOrder = 0) {
  if (!items.length) return;
  const codes = [...new Set(items.map((i) => i.code))];
  const { data, error } = await supabase.from("exercises").select("id,code").in("code", codes);
  if (error) throw error;
  const ids = new Map(data.map((e) => [e.code, e.id]));
  const rows = items.map((item, i) => {
    const exercise_id = ids.get(item.code);
    if (!exercise_id) throw new Error(`Unknown exercise ${item.code}`);
    return { workout_id: workoutId, exercise_id, target_sets: Math.max(1, item.sets), target_reps: item.reps, target_load: item.load ?? "", note: item.note ?? null, phase: item.phase ?? "main", sort_order: startOrder + i };
  });
  const { error: insertError } = await supabase.from("workout_exercises").insert(rows);
  if (insertError) throw insertError;
}

export async function moveRow(rows: PlannedRow[], id: string, dir: -1 | 1) {
  for (const u of reorderRows(rows, id, dir)) {
    const { error } = await supabase.from("workout_exercises").update({ sort_order: u.proposal_order }).eq("id", u.id);
    if (error) throw error;
  }
}

export async function addPlannedExercise(workoutId: string, code: string, rows: PlannedRow[], _gymId: string | null, lastLoad: string, sets: number, reps: number, phase: Phase = "main") {
  await insertPlannedExercises(workoutId, [{ code, sets, reps, load: lastLoad, phase }], nextOrder(rows));
}

/** Removes a planned row only; completed sets live in log_entries and are never touched here. */
export async function removePlannedRow(id: string) {
  const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
  if (error) throw error;
}

export async function setRowPhase(id: string, phase: Phase) {
  const { error } = await supabase.from("workout_exercises").update({ phase }).eq("id", id);
  if (error) throw error;
}

/** Updates the plan's targets (not a fact). */
export async function updatePlannedRow(id: string, v: { sets: number; reps: number; load: string; note: string | null }) {
  const { error } = await supabase.from("workout_exercises").update({ target_sets: Math.max(1, v.sets), target_reps: v.reps, target_load: v.load, note: v.note }).eq("id", id);
  if (error) throw error;
}

/** Ends a workout: keeps the plan for plan-vs-actual, marks it finished, or deletes it when nothing was done. */
export async function finishWorkout(workoutId: string, anyDone: boolean) {
  const { error } = anyDone
    ? await supabase.from("workouts").update({ completed_at: new Date().toISOString() }).eq("id", workoutId)
    : await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;
}

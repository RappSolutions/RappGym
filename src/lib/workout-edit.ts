import { supabase } from "@/integrations/supabase/client";
import { todayISO, type LogEntry } from "@/lib/gym";
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

export async function moveRow(rows: LogEntry[], id: string, dir: -1 | 1) {
  // Persist a full order once, so rows that still have NULL order become explicit.
  for (const u of reorderRows(rows, id, dir)) {
    const { error } = await supabase.from("log_entries").update({ proposal_order: u.proposal_order }).eq("id", u.id).eq("status", "suggested");
    if (error) throw error;
  }
}

export async function addPlannedExercise(workoutId: string, code: string, rows: LogEntry[], gymId: string | null, lastLoad: string, sets: number, reps: number, phase: Phase = "main") {
  const { error } = await supabase.from("log_entries").insert({ code, sets: Math.max(1, sets), reps, load: lastLoad, date: rows[0]?.date ?? todayISO(), gym_id: gymId, status: "suggested", workout_id: workoutId, proposal_order: nextOrder(rows), phase });
  if (error) throw error;
}

/** Removes a planned row only; completed sets are facts and never touched here. */
export async function removePlannedRow(id: string) {
  const { error } = await supabase.from("log_entries").delete().eq("id", id).eq("status", "suggested");
  if (error) throw error;
}

/** Move a planned row to another phase (intro/main/outro); completed rows are never touched. */
export async function setRowPhase(id: string, phase: "intro" | "main" | "outro") {
  const { error } = await supabase.from("log_entries").update({ phase }).eq("id", id).eq("status", "suggested");
  if (error) throw error;
}

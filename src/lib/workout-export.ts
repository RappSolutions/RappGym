import { groupByPhase } from "@/lib/circuit";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type Ex = { id: string; code: string; name: string; category: string; equipment: string; reps_unit?: string | null };
type Gym = { id: string; name: string };

export type PrintRow = { code: string; exercise_id: string; sets: number; reps: number | null; load: string; note: string | null; phase: string };

const target = (r: { reps: number | null; load: string }, unit: string) =>
  [r.load, r.reps != null ? `${r.reps}${unit && unit !== "reps" ? ` ${unit}` : ""}` : ""].filter(Boolean).join(" × ");

type SheetMeta = { title: string; date: string; gym?: string | undefined; labels: { lap: string; note: string; phases: Record<string, string> } };

/** Pure session-sheet model: one table per phase, lap boxes up to max sets ("—" where a row has fewer). */
export function workoutSheet(w: SheetMeta, rows: readonly PrintRow[], exercises: readonly Ex[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const laps = Math.max(1, ...rows.map((r) => r.sets || 1));
  const head = ["#", "", "", "", ...Array.from({ length: laps }, (_, i) => `${w.labels.lap} ${i + 1}`), w.labels.note];
  let n = 0;
  const sections = groupByPhase(rows).map(({ phase, rows: rs }) => ({
    title: w.labels.phases[phase] ?? phase,
    body: rs.map((r) => {
      const e = byId.get(r.exercise_id);
      return [String(++n), `${r.code} ${e?.name ?? ""}${e?.equipment ? `\n${e.equipment}` : ""}`, target(r, e?.reps_unit ?? ""), r.note ?? "", ...Array.from({ length: laps }, (_, i) => (i < (r.sets || 1) ? "" : "—")), ""];
    }),
  }));
  return { title: w.title, subtitle: `${w.date}${w.gym ? ` · ${w.gym}` : ""}`, head, laps, sections };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Synchronous (keeps user activation): builds an A4 PDF and downloads it. */
export function downloadWorkoutPdf(w: SheetMeta, rows: readonly PrintRow[], exercises: readonly Ex[]) {
  const s = workoutSheet(w, rows, exercises);
  const doc = new jsPDF({ orientation: s.laps > 4 ? "landscape" : "portrait", unit: "mm", format: "a4" });
  doc.setFontSize(16); doc.text(s.title, 12, 16);
  doc.setFontSize(10); doc.text(s.subtitle, 12, 22);
  let y = 28;
  for (const sec of s.sections) {
    doc.setFontSize(12); doc.text(sec.title, 12, y + 4);
    autoTable(doc, { startY: y + 6, head: [s.head], body: sec.body, theme: "grid", margin: { left: 12, right: 12 },
      styles: { fontSize: 9, cellPadding: 1.5, textColor: 0, lineColor: 0, lineWidth: 0.2, minCellHeight: 9 },
      headStyles: { fillColor: 235, textColor: 0, fontSize: 8 },
      columnStyles: { 0: { cellWidth: 7 }, ...Object.fromEntries(Array.from({ length: s.laps }, (_, i) => [4 + i, { cellWidth: 13 }])) } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }
  downloadBlob(doc.output("blob"), `rappgym-${w.date}-${w.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "pass"}.pdf`);
}

type LogRow = { date: string; created_at: string; code: string; exercise_id: string | null; exercise_name: string; gym_id: string | null; phase: string; lap: number | null; set_number: number | null; load: string; reps: number | null; reps_unit: string; exercise_rating: number | null; note: string | null; workout?: { title: string } | null };

export const LOG_EXPORT_COLUMNS = ["date", "time", "location", "workout", "phase", "category", "code", "exercise", "equipment", "lap", "set", "load", "reps", "unit", "rating", "note"] as const;

/** Completed log facts as sheet rows, oldest first; dates ISO, time HH:MM (UTC). */
export function logExportRows(log: readonly LogRow[], exercises: readonly Ex[], gyms: readonly Gym[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const gym = new Map(gyms.map((g) => [g.id, g.name]));
  return [...log].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)).map((r) => {
    const e = r.exercise_id ? byId.get(r.exercise_id) : undefined;
    return [r.date, r.created_at.slice(11, 16), r.gym_id ? gym.get(r.gym_id) ?? "" : "", r.workout?.title ?? "", r.phase, e?.category ?? "", r.code, r.exercise_name || e?.name || "", e?.equipment ?? "", r.lap ?? "", r.set_number ?? "", r.load, r.reps ?? "", r.reps_unit, r.exercise_rating ?? "", r.note ?? ""];
  });
}

export function downloadLogXlsx(header: readonly string[], rows: (string | number)[][], today: string) {
  const ws = XLSX.utils.aoa_to_sheet([[...header], ...rows]);
  ws["!cols"] = header.map((_, i) => ({ wch: [11, 6, 14, 22, 9, 10, 7, 26, 14, 5, 5, 8, 6, 6, 6, 30][i] ?? 10 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Log");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `rappgym-log-${today}.xlsx`);
}

import { workoutSteps } from "@/lib/circuit";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

type Ex = { id: string; code: string; name: string; category: string; equipment: string; reps_unit?: string | null };
type Gym = { id: string; name: string };

export type PrintRow = { code: string; exercise_id: string; sets: number; reps: number | null; load: string; note: string | null; phase: string };

const target = (r: { reps: number | null; load: string }, unit: string) =>
  [r.load, r.reps != null ? `${r.reps}${unit && unit !== "reps" ? ` ${unit}` : ""}` : ""].filter(Boolean).join(" × ");

type SheetMeta = { title: string; date: string; gym?: string | undefined; labels: { lap: string; note: string; phases: Record<string, string> } };

/** Pure session-sheet model: one box per set in actual circuit execution order (2 exercises × 3 laps = 6 sets). */
export function workoutSheet(w: SheetMeta, rows: readonly PrintRow[], exercises: readonly Ex[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const steps = workoutSteps(rows.map((r, i) => ({ ...r, id: String(i) })), true);
  const sets = steps.map((st, i) => {
    const e = byId.get(st.row.exercise_id);
    return { n: i + 1, phase: w.labels.phases[st.phase] ?? st.phase, lap: st.lap, exerciseId: st.row.exercise_id, code: st.row.code, name: e?.name ?? "", equipment: e?.equipment ?? "", target: target(st.row, e?.reps_unit ?? ""), note: st.row.note ?? "" };
  });
  return { title: w.title, subtitle: `${w.date}${w.gym ? ` · ${w.gym}` : ""}`, sets };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Preload exercise pictures as JPEG data URLs (max 400px) so the PDF click stays synchronous. */
export async function loadPdfImages(srcByExercise: ReadonlyMap<string, string>): Promise<Map<string, { data: string; ratio: number }>> {
  const out = new Map<string, { data: string; ratio: number }>();
  await Promise.all([...srcByExercise].map(async ([id, src]) => {
    try {
      const img = new Image(); img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img")); img.src = src; });
      const k = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const ctx = c.getContext("2d"); if (!ctx) return;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      out.set(id, { data: c.toDataURL("image/jpeg", 0.8), ratio: c.width / c.height });
    } catch { /* picture skipped */ }
  }));
  return out;
}

/** Synchronous (keeps user activation): A4 PDF, one box per set, optional picture; boxes never split across pages. */
export function downloadWorkoutPdf(w: SheetMeta, rows: readonly PrintRow[], exercises: readonly Ex[], images?: ReadonlyMap<string, { data: string; ratio: number }>) {
  const s = workoutSheet(w, rows, exercises);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 12, H = 297;
  doc.setFontSize(16); doc.text(s.title, M, 16);
  doc.setFontSize(10); doc.text(s.subtitle, M, 22);
  let y = 28;
  for (const st of s.sets) {
    const img = images?.get(st.exerciseId);
    const boxH = img ? 38 : 24;
    if (y + boxH > H - M) { doc.addPage(); y = M; }
    doc.setDrawColor(0); doc.setLineWidth(0.2); doc.rect(M, y, W - 2 * M, boxH);
    let x = M + 3;
    if (img) { const ih = boxH - 4, iw = Math.min(ih * img.ratio, 50); doc.addImage(img.data, "JPEG", x, y + 2, iw, iw / img.ratio > ih ? ih : iw / img.ratio); x += iw + 4; }
    doc.setFontSize(8); doc.setTextColor(90); doc.text(`#${st.n} · ${st.phase} · ${w.labels.lap} ${st.lap}`, x, y + 5);
    doc.setTextColor(0); doc.setFontSize(12); doc.text(`${st.code} ${st.name}`, x, y + 11, { maxWidth: W - M - x - 3 });
    doc.setFontSize(9);
    doc.text([st.equipment, st.target].filter(Boolean).join(" · "), x, y + 16, { maxWidth: W - M - x - 3 });
    if (st.note) doc.text(st.note, x, y + 20, { maxWidth: W - M - x - 3 });
    doc.setTextColor(90); doc.text(`${w.labels.note}:`, x, y + boxH - 3); doc.setTextColor(0);
    doc.line(x + 22, y + boxH - 3, W - M - 3, y + boxH - 3);
    y += boxH + 3;
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

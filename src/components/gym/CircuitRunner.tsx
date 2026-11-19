import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { ExercisePickList } from "@/components/gym/ExercisePickList";
import { Minus, Plus, Check, SkipForward, Dumbbell, ListOrdered, ArrowUp, ArrowDown, Trash2, Undo2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, exercisesQuery, lastByCode, logQuery, suggestionsQuery, todayISO } from "@/lib/gym";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { adjustLoad, groupByPhase, remainingSteps, workoutSteps, PHASES, type Phase } from "@/lib/circuit";
import { addPlannedExercise, canMove, moveRow, orderedRows, removePlannedRow, setRowPhase } from "@/lib/workout-edit";
import { AdminExerciseEdit } from "@/components/gym/AdminExerciseEdit";
import { repsUnit } from "@/lib/reps-unit";
import { PhaseSelect } from "@/components/gym/PhaseSelect";
import { Switch } from "@/components/ui/switch";

/** Guided runner for one workout. Rows and completed sets are read live, so exercises can be added, reordered and removed mid-workout. */
export function CircuitRunner({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const { t, localize } = useLanguage();
  const qc = useQueryClient();
  const { data: allExercises = [] } = useQuery(exercisesQuery);
  const { data: log = [] } = useQuery(logQuery);
  const { data: suggestions = [] } = useQuery(suggestionsQuery);
  const { data: links = [] } = useQuery(exerciseLocationsQuery);
  const { data: workout } = useQuery({
    queryKey: ["workout", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("id,title,is_circuit,gym_id,is_spontaneous").eq("id", workoutId).single();
      if (error) throw error;
      return data;
    },
  });
  const rows = useMemo(() => orderedRows(suggestions.filter((r) => r.workout_id === workoutId)), [suggestions, workoutId]);
  const doneRows = useMemo(() => log.filter((e) => e.workout_id === workoutId), [log, workoutId]);
  const doneByCode = useMemo(() => { const m = new Map<string, number>(); for (const e of doneRows) m.set(e.code, (m.get(e.code) ?? 0) + Math.max(1, e.sets ?? 1)); return m; }, [doneRows]);
  const circuit = workout?.is_circuit ?? true;
  const showLaps = circuit && !workout?.is_spontaneous;
  const allSteps = useMemo(() => workoutSteps(rows, circuit), [rows, circuit]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const steps = useMemo(() => remainingSteps(allSteps, doneByCode).filter((s) => !skipped.has(`${s.row.id}:${s.set}`)), [allSteps, doneByCode, skipped]);
  const [focus, setFocus] = useState<Phase | null>(null);
  const step = steps.find((s) => s.phase === focus) ?? steps[0];
  const total = allSteps.length;
  const doneCount = Math.min(total, allSteps.filter((s) => s.set <= (doneByCode.get(s.row.code) ?? 0)).length);
  const laps = Math.max(0, ...allSteps.filter((s) => s.phase === (step?.phase ?? "main")).map((s) => s.lap));
  const phases = PHASES.filter((ph) => allSteps.some((s) => s.phase === ph));
  const phaseDone = (ph: Phase) => allSteps.filter((s) => s.phase === ph).every((s) => s.set <= (doneByCode.get(s.row.code) ?? 0));
  const last = useMemo(() => lastByCode(log), [log]);
  const [loads, setLoads] = useState<Map<string, string>>(new Map());
  const [reps, setReps] = useState<Map<string, number>>(new Map());
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const cats = categoriesOf(allExercises);
  const catOf = (code: string) => categoryToken(allExercises.find((e) => e.code === code)?.category ?? "", cats);
  const pickable = exercisesAtLocation(allExercises.filter((e) => e.is_active), links, workout?.gym_id ?? null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["log"] }), qc.invalidateQueries({ queryKey: ["workout-suggestions"] })]);

  async function close(finished: boolean) {
    if (finished) {
      await supabase.from("log_entries").delete().eq("workout_id", workoutId).eq("status", "suggested");
      toast.success(t("circuitRunner.workoutDoneSetsLogged", { length: doneRows.length }));
    } else if (rows.length === 0 && doneRows.length === 0) {
      await supabase.from("workouts").delete().eq("id", workoutId);
    }
    await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["accepted-ai-workouts"] })]);
    onClose();
  }

  const r = step?.row;
  const load = r ? loads.get(r.id) ?? doneRows.find((e) => e.code === r.code)?.load ?? r.load ?? "" : "";
  const setLoad = (v: string) => r && setLoads((m) => new Map(m).set(r.id, v));
  const rep = r ? reps.get(r.id) ?? r.reps ?? 10 : 10;
  const setRep = (v: number) => r && setReps((m) => new Map(m).set(r.id, Math.max(0, v)));

  async function run(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch { toast.error(t("common.couldNotSaveTryAgain")); } finally { setBusy(false); }
  }

  const logStep = () => run(async () => {
    if (!step || !r) return;
    const { error } = await supabase.from("log_entries").insert({ code: r.code, sets: 1, reps: rep, load, date: todayISO(), gym_id: r.gym_id, status: "completed", workout_id: workoutId, phase: step.phase, note: step.set === 1 ? r.note : null });
    if (error) throw error;
    await refresh();
  });

  const undo = () => run(async () => {
    const latest = [...doneRows].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!latest) return;
    if (!await confirmDialog(t("circuitRunner.undoLastSet", { code: latest.code }))) return;
    const { error } = await supabase.from("log_entries").delete().eq("id", latest.id).eq("status", "completed");
    if (error) throw error;
    await refresh();
  });

  const saveTitle = () => {
    const v = title?.trim();
    setTitle(null);
    if (!v || v === workout?.title) return;
    void run(async () => { const { error } = await supabase.from("workouts").update({ title: v }).eq("id", workoutId); if (error) throw error; await qc.invalidateQueries({ queryKey: ["workout", workoutId] }); await refresh(); toast.success(t("circuitRunner.nameSaved")); });
  };

  const rawEx = r ? allExercises.find((e) => e.code === r.code) : undefined;
  const ex = rawEx ? localize(rawEx) : undefined;
  const stepNo = Math.min(total, doneCount + 1);
  return (
    <Drawer open onOpenChange={(o) => { if (!o) void close(false); }}>
      <DrawerContent>
        <div className="mx-auto max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto px-4 pb-8">
          <DrawerHeader className="space-y-2 px-0">
            <div className="relative"><Input aria-label={t("circuitRunner.workoutName")} value={title ?? workout?.title ?? ""} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-9 pr-8 text-sm font-semibold" /><Pencil className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /></div>
            <DrawerTitle className="font-display text-2xl">
              {total === 0 || !step ? t("circuitRunner.addAnExercise") : <>{t(`phase.${step.phase}`)} · {showLaps ? <>{t("circuitRunner.lap", { v0: step?.lap ?? laps, laps })} · </> : !circuit ? <>{`Set ${step?.set ?? 1}/${step?.row.sets ?? 1}`} · </> : null}{t("circuitRunner.step", { stepNo, total })}</>}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{`${doneCount}/${total}`}</DrawerDescription>
            {phases.length > 1 && <div className="flex flex-wrap items-center gap-1 text-xs" aria-label={t("phase.phases")}>
              {phases.map((ph, i) => {
                const active = step?.phase === ph;
                const finished = !active && phaseDone(ph);
                return <span key={ph} className="flex items-center gap-1">{i > 0 && <span className="text-muted-foreground">→</span>}<button type="button" disabled={finished || active} onClick={() => setFocus(ph)} className={`rounded-full border px-2 py-0.5 cursor-pointer hover:border-primary disabled:cursor-not-allowed disabled:hover:border-transparent font-semibold uppercase tracking-wider ${active ? "border-primary bg-primary text-primary-foreground" : finished ? "border-transparent text-muted-foreground" : "border-border text-muted-foreground"}`}>{finished ? "✓ " : ""}{t(`phase.${ph}`)}{active && showLaps ? ` · ${step?.lap}/${laps}` : ""}</button></span>;
              })}
            </div>}
            {total > 0 && <div className="flex h-2 gap-2" aria-label={`${doneCount}/${total} set`}>
              {phases.map((ph) => <div key={ph} className="flex gap-0.5" style={{ flex: allSteps.filter((s) => s.phase === ph).length }}>{allSteps.filter((s) => s.phase === ph).map((s) => {
                const isDone = s.set <= (doneByCode.get(s.row.code) ?? 0);
                const isCurrent = step && s.row.id === step.row.id && s.set === step.set;
                return <span key={`${s.row.id}:${s.set}`} title={`${s.row.code} · ${s.lap}`} data-category={catOf(s.row.code)} className={`category-theme flex-1 rounded-sm bg-category-fill ${isDone ? "" : isCurrent ? "animate-pulse ring-1 ring-foreground" : "opacity-25"}`} />;
              })}</div>)}
            </div>}
          </DrawerHeader>

          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"><span className="font-medium">{t("common.runAsCircuit")}</span><Switch checked={circuit} disabled={busy} onCheckedChange={(value) => void run(async () => { const { error } = await supabase.from("workouts").update({ is_circuit: value }).eq("id", workoutId); if (error) throw error; await qc.invalidateQueries({ queryKey: ["workout", workoutId] }); })} /></label>
            <Button variant={listOpen ? "default" : "outline"} size="icon" aria-pressed={listOpen} aria-label={t("circuitRunner.exercisesInWorkout")} title={t("circuitRunner.exercisesInWorkout")} onClick={() => setListOpen((v) => !v)}><ListOrdered className="size-4" /></Button>
            <Button variant={adding ? "default" : "outline"} aria-pressed={adding} aria-label={t("common.addExercise")} title={t("common.addExercise")} onClick={() => setAdding((v) => !v)}><Plus className="size-4" /><Dumbbell className="size-4" /></Button>
          </div>

          {adding && <ExercisePickList exercises={pickable} disabled={busy} onPick={(e, ph) => void run(async () => { await addPlannedExercise(workoutId, e.code, rows, workout?.gym_id ?? null, last.get(e.code)?.load ?? "", circuit ? Math.max(1, laps) : 3, last.get(e.code)?.reps ?? 10, ph); await refresh(); setAdding(false); toast.success(`${e.code} ${t("circuitRunner.added")}`); })} />}

          {listOpen && rows.length > 0 && <div className="rounded-md border text-sm">
            {groupByPhase(rows).map((g) => <div key={g.phase}><p className="border-b bg-muted/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(`phase.${g.phase}`)}</p><div className="divide-y">{g.rows.map((row) => {
              const doneSets = doneByCode.get(row.code) ?? 0;
              return <div key={row.id} data-category={catOf(row.code)} className="category-theme flex items-center gap-2 border-l-4 border-category-fill py-1 pl-2 pr-1">
                <span className="w-10 font-bold text-category-ink">{row.code}</span>
                <span className="flex-1 truncate">{localize(allExercises.find((e) => e.code === row.code) ?? { code: row.code, name: row.code } as never).name}</span>
                <span className="tabular-nums text-xs text-muted-foreground">{Math.min(doneSets, row.sets)}/{row.sets}</span>
                <PhaseSelect value={row.phase} disabled={busy} onChange={(ph) => void run(async () => { await setRowPhase(row.id, ph); await refresh(); })} />
                <Button variant="ghost" size="icon" className="size-8" disabled={busy || !canMove(rows, row.id, -1)} aria-label={t("common.moveUp")} onClick={() => void run(async () => { await moveRow(rows, row.id, -1); await refresh(); })}><ArrowUp className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" disabled={busy || !canMove(rows, row.id, 1)} aria-label={t("common.moveDown")} onClick={() => void run(async () => { await moveRow(rows, row.id, 1); await refresh(); })}><ArrowDown className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" disabled={busy} aria-label={t("common.remove")} onClick={async () => { if (await confirmDialog(t("circuitRunner.removeFromTheWorkoutLogged", { code: row.code }))) void run(async () => { await removePlannedRow(row.id); await refresh(); }); }}><Trash2 className="size-4" /></Button>
              </div>;
            })}</div></div>)}
          </div>}

          {r && <div className="space-y-3">
            <div><p className="flex items-center gap-1 font-bold text-primary">{r.code}<AdminExerciseEdit exercise={rawEx} /></p><p className="text-xl font-bold">{ex?.name ?? r.code}</p>{r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}</div>
            {ex && <ExerciseImages exercise={ex} />}
            {ex?.instructions && <p className="text-sm leading-relaxed">{ex.instructions}</p>}
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><p className="text-sm font-medium">{t("common.weightKg")}</p>
                <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="-5 kg" onClick={() => setLoad(adjustLoad(load, -5))}><Minus /></Button><Input inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} className="h-10 min-w-0 px-1 text-center text-lg font-bold" /><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="+5 kg" onClick={() => setLoad(adjustLoad(load, 5))}><Plus /></Button></div></div>
              <div className="space-y-1"><p className="text-sm font-medium">{t(`repsUnitLong.${repsUnit(rawEx)}`)}</p>
                <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="-1" onClick={() => setRep(rep - 1)}><Minus /></Button><Input inputMode="numeric" value={rep} onChange={(e) => setRep(Number(e.target.value) || 0)} className="h-10 min-w-0 px-1 text-center text-lg font-bold" /><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="+1" onClick={() => setRep(rep + 1)}><Plus /></Button></div></div>
            </div>
            <div className="flex gap-2"><Button variant="ghost" disabled={busy} onClick={() => step && setSkipped((s) => new Set(s).add(`${step.row.id}:${step.set}`))}><SkipForward className="size-4" />{t("circuitRunner.skip")}</Button><Button className="h-12 flex-1 text-lg" disabled={busy} onClick={() => void logStep()}><Check />{t("circuitRunner.done")}</Button></div>
          </div>}
          {!r && total > 0 && <p className="text-sm text-muted-foreground">{t("circuitRunner.allSetsDoneAddThe")}</p>}
          <div className="flex gap-2">
            {doneRows.length > 0 && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void undo()}><Undo2 className="size-4" />{t("circuitRunner.undoLastSet2")}</Button>}
            <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={() => void close(doneRows.length > 0)}>{t("circuitRunner.endWorkout")}</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

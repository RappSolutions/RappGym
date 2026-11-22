import { useUserView } from "@/lib/user-view";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { InstructionText } from "@/components/gym/InstructionText";
import { RatingPicker } from "@/components/gym/RatingPicker";
import { ExercisePickList } from "@/components/gym/ExercisePickList";
import { Minus, Plus, Check, SkipForward, ListOrdered, Trash2, Undo2, Octagon, Settings, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, exercisesQuery, lastByCode, logQuery, suggestionsQuery, todayISO } from "@/lib/gym";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { adjustLoad, defaultPlannedSets, groupByPhase, workoutSteps, PHASES, type Phase } from "@/lib/circuit";
import { addPlannedExercise, finishWorkout, applyPlacement, orderedRows, removePlannedRow, updatePlannedRow } from "@/lib/workout-edit";
import { emptyRunnerState, parseRunnerState, lapMinutes, remainingLapMinutes, completedStepKeys, type RunnerState } from "@/lib/runner-state";
import { AdminExerciseEdit } from "@/components/gym/AdminExerciseEdit";
import { repsUnit } from "@/lib/reps-unit";
import { SortablePlan } from "@/components/gym/SortablePlan";
import { FinishFlag } from "@/components/gym/FinishFlag";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Guided runner for one workout. Rows and completed sets are read live, so exercises can be added, reordered and removed mid-workout. */
export function CircuitRunner({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const { t, localize } = useLanguage();
  const { readOnly, view } = useUserView();
  const qc = useQueryClient();
  const { data: allExercises = [] } = useQuery(exercisesQuery);
  const { data: log = [] } = useQuery(logQuery);
  const { data: suggestions = [] } = useQuery(suggestionsQuery);
  const { data: links = [] } = useQuery(exerciseLocationsQuery);
  const { data: workout, isError: workoutError } = useQuery({
    queryKey: ["workout", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("id,title,is_circuit,gym_id,is_spontaneous,started_at,completed_at").eq("id", workoutId).single();
      if (error) throw error;
      return data;
    },
  });
  const rows = useMemo(() => orderedRows(suggestions.filter((r) => r.workout_id === workoutId)), [suggestions, workoutId]);
  useEffect(() => { if (workoutError || workout?.completed_at) onClose(); }, [workoutError, workout?.completed_at]);
  const doneRows = useMemo(() => log.filter((e) => e.workout_id === workoutId), [log, workoutId]);
  const doneByCode = useMemo(() => { const m = new Map<string, number>(); for (const e of doneRows) m.set(e.code, (m.get(e.code) ?? 0) + Math.max(1, e.sets ?? 1)); return m; }, [doneRows]);
  const circuit = workout?.is_circuit ?? true;
  const allSteps = useMemo(() => workoutSteps(rows, circuit), [rows, circuit]);
  const doneKeys = useMemo(() => completedStepKeys(allSteps, doneRows), [allSteps, doneRows]);
  const [runtime, setRuntime] = useState<RunnerState>(emptyRunnerState);
  const [restored, setRestored] = useState(false);
  const storageKey = `rappgym-run:${view?.actorId}:${view?.userId}:${workoutId}`;
  useEffect(() => { setRuntime(parseRunnerState(sessionStorage.getItem(storageKey))); setRestored(true); }, [storageKey]);
  useEffect(() => { if (restored) sessionStorage.setItem(storageKey, JSON.stringify(runtime)); }, [runtime, restored, storageKey]);
  const skipped = useMemo(() => new Set(runtime.skipped), [runtime.skipped]);
  const steps = useMemo(() => allSteps.filter((s) => !doneKeys.has(`${s.row.id}:${s.set}`) && !skipped.has(`${s.row.id}:${s.set}`)), [allSteps, doneKeys, skipped]);
  const keyOf = (s: { row: { id: string }; set: number }) => `${s.row.id}:${s.set}`;
  const { cursor, fromIdx } = runtime;
  const setCursor = (cursor: string | null) => setRuntime((v) => ({ ...v, cursor, pause: null }));
  const remainingKeys = useMemo(() => new Set(steps.map(keyOf)), [steps]);
  const step = (cursor ? allSteps.find((s) => keyOf(s) === cursor) : undefined)
    ?? allSteps.find((s, i) => i > fromIdx && remainingKeys.has(keyOf(s))) ?? steps[0];
  const stepIdx = step ? allSteps.findIndex((s) => keyOf(s) === keyOf(step)) : -1;
  const advance = () => setRuntime((v) => ({ ...v, cursor: null, fromIdx: stepIdx }));
  const jumpPhase = (ph: Phase) => setRuntime((v) => ({ ...v, cursor: null, fromIdx: allSteps.findIndex((s) => s.phase === ph) - 1, pause: null }));
  const total = allSteps.length;
  const doneCount = doneKeys.size;
  const laps = Math.max(0, ...allSteps.filter((s) => s.phase === (step?.phase ?? "main")).map((s) => s.lap));
  const phases = PHASES.filter((ph) => allSteps.some((s) => s.phase === ph));
  const phaseDone = (ph: Phase) => allSteps.filter((s) => s.phase === ph).every((s) => doneKeys.has(keyOf(s)));
  const last = useMemo(() => lastByCode(log), [log]);
  const loads = useMemo(() => new Map(runtime.loads), [runtime.loads]);
  const reps = useMemo(() => new Map(runtime.reps), [runtime.reps]);
  const [busy, setBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const cats = categoriesOf(allExercises);
  const catOf = (code: string) => categoryToken(allExercises.find((e) => e.code === code)?.category ?? "", cats);
  const pickable = exercisesAtLocation(allExercises.filter((e) => e.is_active), links, workout?.gym_id ?? null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["log"] }), qc.invalidateQueries({ queryKey: ["workout-suggestions"] })]);
  const starting = useRef(false);
  useEffect(() => {
    if (!workout || readOnly || starting.current || workout.started_at || workout.completed_at || doneRows.length) return;
    starting.current = true;
    void supabase.from("workouts").update({ started_at: new Date().toISOString() }).eq("id", workoutId).is("started_at", null)
      .then(({ error }) => { if (error) toast.error(t("common.couldNotSaveTryAgain")); else void qc.invalidateQueries({ queryKey: ["workout", workoutId] }); });
  }, [workout, readOnly, doneRows.length, workoutId, qc, t]);
  const activeLapKey = step ? `${step.phase}:${step.lap}` : null;
  useEffect(() => {
    if (!restored || !activeLapKey || runtime.pause || !workout || runtime.lapKey === activeLapKey) return;
    setRuntime((v) => ({ ...v, lapKey: activeLapKey, lapStartedAt: v.lapKey === null && doneRows.length === 0 ? (workout.started_at ? Date.parse(workout.started_at) : Date.now()) : Date.now(), durations: v.lapKey?.split(":")[0] === step?.phase ? v.durations : [] }));
  }, [activeLapKey, restored, runtime.pause, runtime.lapKey, workout, doneRows.length, step?.phase]);
  const activeBlip = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { activeBlip.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" }); }, [cursor, stepIdx]);

  async function close(finished: boolean) {
    if (readOnly) { onClose(); return; }
    if (finished) {
      await finishWorkout(workoutId, true);
      toast.success(t("circuitRunner.workoutDoneSetsLogged", { length: doneRows.length }));
      sessionStorage.removeItem(storageKey);
    }
    await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["accepted-ai-workouts"] })]);
    onClose();
  }
  const endWorkout = () => run(async () => {
    if (doneCount < total || !doneRows.length) {
      if (!await confirmDialog(t("circuitRunner.endConfirm"))) return;
    }
    if (doneRows.length) await close(true);
    else { await finishWorkout(workoutId, false); sessionStorage.removeItem(storageKey); await refresh(); onClose(); }
  });

  const r = step?.row;
  const load = r ? loads.get(r.id) ?? doneRows.find((e) => e.code === r.code)?.load ?? r.load ?? "" : "";
  const setLoad = (load: string) => r && setRuntime((v) => ({ ...v, loads: [...new Map(v.loads).set(r.id, load)] }));
  const rep = r ? reps.get(r.id) ?? r.reps ?? 10 : 10;
  const setRep = (rep: number) => r && setRuntime((v) => ({ ...v, reps: [...new Map(v.reps).set(r.id, Math.max(0, rep))] }));

  async function run(fn: () => Promise<unknown>) {
    if (readOnly || busy) return;
    setBusy(true);
    try { await fn(); } catch { toast.error(t("common.couldNotSaveTryAgain")); } finally { setBusy(false); }
  }

  const logStep = () => run(async () => {
    if (!step || !r || doneKeys.has(keyOf(step))) return;
    const endedAt = Date.now();
    const { error } = await supabase.from("log_entries").insert({ code: r.code, exercise_id: r.exercise_id, sets: 1, reps: rep, load, date: todayISO(), gym_id: r.gym_id, status: "completed", workout_id: workoutId, phase: step.phase, lap: circuit ? step.lap : null, set_number: step.set, note: step.set === 1 ? r.note : null });
    if (error) throw error;
    advance();
    const next = steps.find((s) => allSteps.indexOf(s) > stepIdx);
    if (circuit && (!next || next.phase !== step.phase || next.lap !== step.lap)) {
      const minutes = lapMinutes(runtime.lapStartedAt, endedAt);
      setRuntime((v) => ({ ...v, pause: { phase: step.phase, lap: step.lap, endedAt, minutes }, durations: minutes === null ? v.durations : [...v.durations, minutes] }));
    }
    await refresh();
  });

  const strikeSet = () => run(async () => {
    if (!r || !await confirmDialog(t("circuitRunner.strikeConfirm"))) return;
    if (r.sets <= 1) await removePlannedRow(r.id);
    else await updatePlannedRow(r.id, { sets: r.sets - 1, reps: r.reps ?? 0, load: r.load, note: r.note });
    setRuntime((v) => ({ ...v, cursor: null }));
    await refresh();
  });

  const undo = () => run(async () => {
    const latest = [...doneRows].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!latest) return;
    if (!await confirmDialog(t("circuitRunner.undoLastSet", { code: latest.code }))) return;
    const { error } = await supabase.from("log_entries").delete().eq("id", latest.id).eq("status", "completed");
    if (error) throw error;
    setRuntime((v) => ({ ...v, cursor: null, fromIdx: -1, pause: null }));
    await refresh();
  });

  const stepEntry = step ? doneRows.find((e) => e.code === step.row.code && e.phase === step.phase && e.set_number === step.set && (!circuit || e.lap === null || e.lap === step.lap)) : undefined;
  const undoStep = () => run(async () => {
    if (!stepEntry || !await confirmDialog(t("circuitRunner.undoLastSet", { code: stepEntry.code }))) return;
    const { error } = await supabase.from("log_entries").delete().eq("id", stepEntry.id).eq("status", "completed");
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
  const nameByCode = useMemo(() => { const m = new Map<string, string>(); for (const e of allExercises) m.set(e.code, localize(e).name); return m; }, [allExercises, localize]);
  const lapNos = [...new Set(allSteps.filter((s) => s.phase === step?.phase).map((s) => s.lap))];
  const visibleSteps = allSteps.filter((s) => s.phase === step?.phase && (!circuit || s.lap === step.lap));
  const pause = runtime.pause;
  const pausedLaps = Math.max(1, ...allSteps.filter((s) => s.phase === pause?.phase).map((s) => s.lap));
  const estimate = pause ? remainingLapMinutes(runtime.durations, pausedLaps - pause.lap, workout?.is_spontaneous ?? false) : null;
  function continueLap() {
    setRuntime((v) => ({ ...v, pause: null, lapStartedAt: Date.now(), lapKey: activeLapKey, durations: pause?.phase === step?.phase ? v.durations : [] }));
  }
  if (!restored) return null;
  return (
    <Drawer open onOpenChange={(o) => { if (!o) void close(false); }}>
      <DrawerContent>
        <div className="mx-auto max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto px-4 pb-8">
          <DrawerHeader className="space-y-2 px-0">
            <div className="flex items-center gap-1"><Input disabled={readOnly} aria-label={t("circuitRunner.workoutName")} value={title ?? workout?.title ?? ""} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="h-9 flex-1 border-transparent px-1 text-sm font-semibold shadow-none" />
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={t("circuitRunner.settings")} title={t("circuitRunner.settings")}><Settings className="size-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="flex items-center justify-between gap-3 font-normal"><span>{t("common.runAsCircuit")}</span><Switch checked={circuit} disabled={readOnly || busy} onCheckedChange={(value) => void run(async () => { const { error } = await supabase.from("workouts").update({ is_circuit: value }).eq("id", workoutId); if (error) throw error; await qc.invalidateQueries({ queryKey: ["workout", workoutId] }); })} /></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setListOpen((v) => !v)}><ListOrdered className="size-4" />{t("circuitRunner.exercisesInWorkout")}</DropdownMenuItem>
                  <DropdownMenuItem disabled={readOnly} onSelect={() => setAdding((v) => !v)}><Plus className="size-4" />{t("common.addExercise")}</DropdownMenuItem>
                  {doneRows.length > 0 && <DropdownMenuItem disabled={readOnly || busy} onSelect={() => void undo()}><Undo2 className="size-4" />{t("circuitRunner.undoLastSet2")}</DropdownMenuItem>}
                </DropdownMenuContent></DropdownMenu>
              <Button variant="ghost" size="icon" className="size-9 shrink-0" disabled={readOnly || busy} aria-label={t("circuitRunner.endWorkout")} title={t("circuitRunner.endWorkout")} onClick={() => void endWorkout()}><FinishFlag className="size-5" /></Button></div>
            <DrawerTitle className="sr-only">{workout?.title ?? t("circuitRunner.workoutName")}</DrawerTitle>
            <DrawerDescription className="sr-only">{`${doneCount}/${total}`}</DrawerDescription>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1 text-xs" aria-label={t("phase.phases")}>
                {phases.length > 1 && phases.map((ph) => <Button key={ph} variant={step?.phase === ph ? "secondary" : "ghost"} size="sm" className="px-2" aria-pressed={step?.phase === ph} onClick={() => jumpPhase(ph)}>{phaseDone(ph) && step?.phase !== ph ? "✓ " : ""}{t(`phase.${ph}`)}</Button>)}
              </div>
              {circuit && lapNos.length > 1 && <select className="h-8 shrink-0 rounded-md border border-input bg-background px-2 text-xs" aria-label={t("circuitRunner.laps")} value={String(step?.lap)} onChange={(event) => { const first = allSteps.find((s) => s.phase === step?.phase && s.lap === Number(event.target.value)); if (first) setCursor(keyOf(first)); }}>
                {lapNos.map((lap) => <option key={lap} value={String(lap)}>{t("circuitRunner.lap", { v0: lap, laps })}</option>)}
              </select>}
            </div>
            {total > 0 && <div className="flex gap-1.5 overflow-x-auto px-1.5 py-1.5" aria-label={t("circuitRunner.exercisesInWorkout")}>
              {visibleSteps.map((s) => {
                const isDone = doneKeys.has(keyOf(s));
                const isCurrent = step && keyOf(s) === keyOf(step);
                const isSkipped = !isDone && skipped.has(keyOf(s));
                const name = nameByCode.get(s.row.code) ?? s.row.code;
                return <Button variant="outline" size="sm" ref={isCurrent ? activeBlip : undefined} key={keyOf(s)} aria-label={`${name} · ${s.row.code} · ${s.lap}`} aria-current={isCurrent ? "step" : undefined} title={`${s.row.code} · ${name}`} onClick={() => setCursor(keyOf(s))} data-category={catOf(s.row.code)} className={`category-theme relative min-w-10 shrink-0 border-category-ink bg-category-fill px-2 text-category-on-fill ${isCurrent ? "ring-2 ring-foreground" : isDone || isSkipped ? "" : "opacity-60"}`}>{s.row.code}{isDone ? <Check aria-hidden className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background p-0.5 text-foreground" /> : isSkipped ? <Redo2 aria-hidden className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background p-0.5 text-foreground" /> : null}{!circuit && s.row.sets > 1 ? ` · ${s.set}` : ""}</Button>;
              })}
            </div>}
          </DrawerHeader>

          {adding && <ExercisePickList exercises={pickable} disabled={readOnly || busy} onPick={(e, ph) => void run(async () => { await addPlannedExercise(workoutId, e.code, rows, workout?.gym_id ?? null, last.get(e.code)?.load ?? "", defaultPlannedSets({ spontaneous: workout?.is_spontaneous ?? false, circuit, laps, phase: ph }), last.get(e.code)?.reps ?? 10, ph); await refresh(); if (workout?.is_spontaneous) setRuntime((v) => ({ ...v, pause: null, cursor: null, fromIdx: -1 })); setAdding(false); toast.success(`${e.code} ${t("circuitRunner.added")}`); })} />}

          {listOpen && rows.length > 0 && <div className="rounded-md border text-sm">
            <div className="flex items-center justify-between border-b px-2 py-1"><span className="text-xs font-semibold text-muted-foreground">{t("circuitRunner.exercisesInWorkout")}</span><Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setListOpen(false)}><Check className="size-3.5" />{t("common.doneSorting")}</Button></div>
            <SortablePlan rows={rows} disabled={readOnly || busy} onPlace={(u) => void run(async () => { await applyPlacement(u); await refresh(); })}
              renderHeader={(p, empty) => <p className={`border-b bg-muted/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${empty ? "opacity-50" : ""}`}>{t(`phase.${p}`)}</p>}
              renderRow={(row, handle) => { const doneSets = doneByCode.get(row.code) ?? 0;
              return <div data-category={catOf(row.code)} className="category-theme flex items-center gap-2 border-l-4 border-category-fill py-1 pl-0 pr-1">{handle}
                <span className="w-10 font-bold text-category-ink">{row.code}</span>
                <span className="flex-1 truncate">{localize(allExercises.find((e) => e.code === row.code) ?? { code: row.code, name: row.code } as never).name}</span>
                <span className="tabular-nums text-xs text-muted-foreground">{Math.min(doneSets, row.sets)}/{row.sets}</span>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" disabled={readOnly || busy} aria-label={t("common.remove")} onClick={async () => { if (await confirmDialog(t("circuitRunner.removeFromTheWorkoutLogged", { code: row.code }))) void run(async () => { await removePlannedRow(row.id); await refresh(); }); }}><Trash2 className="size-4" /></Button>
              </div>; }} />
          </div>}

          {pause && <section className="space-y-3 border-y py-6 text-center" aria-live="polite">
            <Check className="mx-auto size-9 text-primary" />
            <h2 className="text-2xl font-bold">{workout?.is_spontaneous ? t("circuitRunner.currentDone") : t("circuitRunner.lapDone", { lap: pause.lap, laps: pausedLaps })}</h2>
            {pause.minutes !== null && <p>{t("circuitRunner.lapTime", { minutes: Math.max(1, Math.round(pause.minutes)) })}</p>}
            {estimate !== null && <p className="text-sm text-muted-foreground">{t("circuitRunner.remainingTime", { minutes: estimate, phase: t(`phase.${pause.phase}`) })}</p>}
            {step && <Button onClick={continueLap}>{step.phase === pause.phase ? t("circuitRunner.nextLap", { lap: step.lap }) : t("circuitRunner.nextPhase", { phase: t(`phase.${step.phase}`) })}</Button>}
            {workout?.is_spontaneous && !step && <Button variant="outline" onClick={() => setAdding(true)}><Plus className="size-4" />{t("common.addExercise")}</Button>}
          </section>}
          {r && !pause && <div className="space-y-3">
            <div><p className="flex items-center gap-1 font-bold text-primary">{r.code}<AdminExerciseEdit exercise={rawEx} /></p><p className="flex items-start justify-between gap-2 text-xl font-bold"><span className="min-w-0">{ex?.name ?? r.code}</span>{rawEx && <RatingPicker exerciseId={rawEx.id} />}</p>{r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}</div>
            {ex && <ExerciseImages exercise={ex} />}
            {ex?.instructions && <InstructionText text={ex.instructions} className="text-sm" />}
            
            <fieldset disabled={readOnly} className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><p className="text-sm font-medium">{t("common.weightKg")}</p>
                <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="-5 kg" onClick={() => setLoad(adjustLoad(load, -5))}><Minus /></Button><Input inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} className="h-10 min-w-0 px-1 text-center text-lg font-bold" /><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="+5 kg" onClick={() => setLoad(adjustLoad(load, 5))}><Plus /></Button></div></div>
              <div className="space-y-1"><p className="text-sm font-medium">{t(`repsUnitLong.${repsUnit(rawEx)}`)}</p>
                <div className="flex items-center gap-1"><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="-1" onClick={() => setRep(rep - 1)}><Minus /></Button><Input inputMode="numeric" value={rep} onChange={(e) => setRep(Number(e.target.value) || 0)} className="h-10 min-w-0 px-1 text-center text-lg font-bold" /><Button variant="outline" size="icon" className="size-10 shrink-0" aria-label="+1" onClick={() => setRep(rep + 1)}><Plus /></Button></div></div>
            </fieldset>
            {step && doneKeys.has(keyOf(step)) ? <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Check className="size-5 text-primary" /><span className="flex-1 font-semibold">{t("circuitRunner.doneResult", { reps: stepEntry?.reps ?? "", load: stepEntry?.load ? ` @ ${stepEntry.load} kg` : "" })}</span>
              {stepEntry && <Button variant="outline" size="sm" disabled={readOnly || busy} onClick={() => void undoStep()}><Undo2 className="size-4" />{t("circuitRunner.undoSet")}</Button>}
            </div> : <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 text-destructive" title={t("circuitRunner.strikeSet")} aria-label={t("circuitRunner.strikeSet")} disabled={readOnly || busy} onClick={() => void strikeSet()}><Octagon className="size-5" /></Button>
              <Button variant="outline" className="h-12" title={t("circuitRunner.goNext")} disabled={readOnly || busy} onClick={() => { if (step) setRuntime((v) => ({ ...v, skipped: [...new Set([...v.skipped, keyOf(step)])], cursor: null, fromIdx: stepIdx })); }}><SkipForward className="size-4" />{t("circuitRunner.moveOn")}</Button>
              <Button className="h-12 flex-1 text-lg" disabled={readOnly || busy} onClick={() => void logStep()}><Check />{t("circuitRunner.done")}</Button>
            </div>}
          </div>}
          {!r && total > 0 && <p className="text-sm text-muted-foreground">{t("circuitRunner.allSetsDoneAddThe")}</p>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

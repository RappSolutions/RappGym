import { useUserView } from "@/lib/user-view";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { defaultPlannedSets, groupByPhase, isWorkoutFinished, workoutSetProgress } from "@/lib/circuit";
import { repsUnit } from "@/lib/reps-unit";
import { SortablePlan } from "@/components/gym/SortablePlan";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileDown, ArrowUpDown, ChevronDown, ChevronRight, Play, Trash2, Sparkles, X, Plus } from "lucide-react";
import { ExercisePickList } from "@/components/gym/ExercisePickList";
import { addPlannedExercise, finishWorkout, applyPlacement, orderedRows, removePlannedRow } from "@/lib/workout-edit";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";
import { LogSheet } from "@/components/gym/LogSheet";
import { useStartWorkout } from "@/components/gym/ActiveWorkout";
import { createdStamp } from "@/lib/workout-meta";
import { WorkoutPdfButton } from "@/components/gym/WorkoutPdfButton";
import {
  categoriesOf,
  categoryToken,
  exercisesQuery,
  gymsQuery,
  suggestionsQuery,
  formatDateWithWeekday,
  logQuery,
  type LogEntry,
  type PlannedRow,
  formatSet,
  todayISO,
  isProposalExpanded,
  finishedPlansQuery,
  lastByCode,
} from "@/lib/gym";

/** Planned (suggested) workouts: encouragement and how-to, kept apart from the factual Log. */
export function PlannedWorkouts() {
  const { t, language, localize } = useLanguage();
  const { readOnly } = useUserView();
  const queryClient = useQueryClient();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const { data: proposals } = useSuspenseQuery(suggestionsQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const { data: links } = useSuspenseQuery(exerciseLocationsQuery);
  const lastDone = lastByCode(log);
  const [showFinished, setShowFinished] = useState(false);
  const { data: finishedRows = [] } = useQuery({ ...finishedPlansQuery, enabled: showFinished });
  const [guidedId, setGuidedId] = useState<string | null>(null);
  const [entry, setEntry] = useState<PlannedRow | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Map<string, boolean>>(new Map());
  const [proposalOverrides, setProposalOverrides] = useState<Map<string, boolean>>(new Map());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortingId, setSortingId] = useState<string | null>(null);
  const today = todayISO();
  const categories = categoriesOf(exercises);
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const days = new Map<string, LogEntry[]>();
  for (const e of log) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  const planned = new Map<string, PlannedRow[]>();
  for (const row of showFinished ? [...proposals, ...finishedRows] : proposals) {
    const key = row.workout_id ?? row.id;
    planned.set(key, [...(planned.get(key) ?? []), row]);
  }
  const guidedRows = guidedId ? (planned.get(guidedId) ?? []) : [];
  const guidedDone = guidedId ? log.filter((row) => row.workout_id === guidedId).length : 0;
  function nextExercise() {
    const next = guidedRows.find((row) => row.id !== entry?.id);
    if (next) setEntry(next);
    else {
      setEntry(null);
      setGuidedId(null);
    }
  }

  async function deleteProposal() {
    if (readOnly || !deletingId || deleting) return;
    setDeleting(true);
    try {
      // Completed sets stay in the log; an untouched plan disappears with its workout.
      await finishWorkout(deletingId, log.some((row) => row.workout_id === deletingId));
      if (guidedId === deletingId) {
        setGuidedId(null);
        setEntry(null);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }),
        queryClient.invalidateQueries({ queryKey: ["accepted-ai-workouts"] }),
      ]);
      setDeletingId(null);
      toast.success(t("plannedWorkouts.suggestionRemoved"));
    } catch {
      toast.error(t("plannedWorkouts.couldNotRemoveSuggestionTry"));
    } finally {
      setDeleting(false);
    }
  }
  const startWorkout = useStartWorkout();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  async function edit(fn: () => Promise<unknown>) {
    if (readOnly || editBusy) return;
    setEditBusy(true);
    try { await fn(); await queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }); }
    catch { toast.error(t("common.couldNotSaveTryAgain")); }
    finally { setEditBusy(false); }
  }
  return (
    <>
      <label className="flex items-center justify-end gap-2 text-sm text-muted-foreground"><span>{t("plannedWorkouts.showFinished")}</span><Switch checked={showFinished} onCheckedChange={setShowFinished} /></label>
      {planned.size > 0 && (
        <section className="space-y-3" aria-label={t("plannedWorkouts.suggestedWorkouts")}>
          <div id="proposed-workouts" className="space-y-3">
            {[...planned].map(([id, unsorted]) => {
              const rows = orderedRows(unsorted);
              const first = rows[0];
              if (!first) return null;
              const { done, total } = workoutSetProgress(id, rows, log);
              const finished = Boolean(first.workout?.completed_at) || isWorkoutFinished(done, total);
              if (finished && !showFinished) return null;
              const doneOf = (row: PlannedRow) => log.filter((e) => e.workout_id === id && e.code === row.code && e.phase === row.phase).length;
              const gym = gyms.find((gym) => gym.id === first.gym_id);
              const open = isProposalExpanded(first.date, today, proposalOverrides, id);
              return (
                <article
                  key={id}
                  className={`space-y-3 rounded-lg border-2 p-3 ${finished ? "border-border bg-muted opacity-80" : "border-dashed border-primary bg-secondary"}`}
                >
                  <div className="flex items-start gap-2">
                  <Button
                    variant="ghost"
                    aria-expanded={open}
                    aria-controls={`proposal-${id}`}
                    onClick={() =>
                      setProposalOverrides((current) =>
                        new Map(current).set(id, !isProposalExpanded(first.date, today, current, id)),
                      )
                    }
                    className="flex h-auto min-h-12 min-w-0 flex-1 items-start justify-start gap-2 whitespace-normal px-0 py-1 text-left hover:bg-transparent"
                  >
                    {open ? (
                      <ChevronDown className="mt-1.5 size-4 shrink-0" />
                    ) : (
                      <ChevronRight className="mt-1.5 size-4 shrink-0" />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block text-xl font-bold">
                        {first.workout?.title}
                        {first.workout?.created_by === "ai" && (
                          <Sparkles className="ml-1 inline size-4 text-primary" aria-label="AI" />
                        )}
                      </span>

                      <span className="mt-0.5 flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0">
                          {formatDateWithWeekday(first.date, language)}
                          {gym ? ` · ${gym.name}` : ""}
                        </span>
                        <span className="shrink-0 font-medium">
                          {done}/{total} {t("plannedWorkouts.setsDone")}
                        </span>
                      </span>
                    </span>
                  </Button>
                  <WorkoutPdfButton title={first.workout?.title ?? ""} date={first.date} gym={gym?.name} rows={rows} exercises={exercises} />
                  {!finished && <Button variant="ghost" size="icon" className="mt-1 shrink-0" disabled={readOnly} title={done ? t("plannedWorkouts.continueWorkout") : t("plannedWorkouts.startWorkout")} aria-label={`${done ? t("plannedWorkouts.continueWorkout") : t("plannedWorkouts.startWorkout")}: ${first.workout?.title}`} onClick={() => startWorkout(id)}><Play className="size-5" /></Button>}
                  </div>
                  <div id={`proposal-${id}`} hidden={!open} className="space-y-3">
                    <div className="divide-y divide-border">{!finished && !readOnly && <div className="flex justify-end"><Button variant={sortingId === id ? "secondary" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" aria-pressed={sortingId === id} onClick={() => setSortingId((v) => v === id ? null : id)}><ArrowUpDown className="size-3.5" />{sortingId === id ? t("common.doneSorting") : t("common.sort")}</Button></div>}
                    <SortablePlan rows={rows} disabled={readOnly || finished || editBusy || sortingId !== id} onPlace={(u) => void edit(() => applyPlacement(u))}
                      renderHeader={(p, empty) => <p className={`border-b pb-0.5 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${empty ? "opacity-50" : ""}`}>{t(`phase.${p}`)}</p>}
                      renderRow={(row, handle) => (
<div data-category={categoryToken(byCode.get(row.code)?.category ?? "", categories)} className="category-theme flex items-center border-l-4 border-category-fill">
                        {handle}
                        <Button
                          variant="ghost"
                          className="grid h-auto min-h-12 min-w-0 flex-1 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 whitespace-normal px-2 py-2 text-left sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
                          onClick={() => {
                            setGuidedId(null);
                            setEntry(row);
                          }}
                        >
                          <span className="font-bold text-category-ink">{row.code}</span>
                          <span className="flex min-w-0 justify-between gap-2 break-words"><span className="min-w-0">{byCode.get(row.code)?.name}</span><span className="shrink-0 tabular-nums text-xs text-muted-foreground">{doneOf(row) ? `${Math.min(doneOf(row), row.sets)}/${row.sets}` : t("plannedWorkouts.lapsCount", { count: row.sets })}</span></span>
                          <span className="col-start-2 min-w-0 break-words text-sm font-semibold sm:col-start-auto">
                            {byCode.get(row.code)?.equipment ? <span className="font-normal text-muted-foreground">{byCode.get(row.code)?.equipment} · </span> : null}
                            {formatSet({ ...row, sets: 1 }, repsUnit(exercises.find((e) => e.code === row.code)) === "reps" ? "" : t(`repsUnit.${repsUnit(exercises.find((e) => e.code === row.code))}`).toLowerCase())}
                          </span>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-destructive" disabled={readOnly || finished || editBusy} aria-label={`${t("common.remove")} ${row.code}`} onClick={async () => { if (await confirmDialog(t("plannedWorkouts.removeFromTheWorkout", { code: row.code }))) void edit(() => removePlannedRow(row.id)); }}><X className="size-4" /></Button>
                        </div>
                      )} /></div>
                    {addingTo === id && <ExercisePickList exercises={exercisesAtLocation(exercises.filter((e) => e.is_active), links, first.gym_id)} disabled={readOnly || finished || editBusy} onPick={(e, ph) => void edit(async () => { await addPlannedExercise(id, e.code, rows, first.gym_id, lastDone.get(e.code)?.load ?? "", defaultPlannedSets({ spontaneous: first.workout?.is_spontaneous ?? false, circuit: first.workout?.is_circuit ?? true, laps: Math.max(1, ...rows.filter((r) => r.phase === ph).map((r) => r.sets)), phase: ph }), lastDone.get(e.code)?.reps ?? 10, ph); setAddingTo(null); })} />}
                    {!finished && <div className="flex items-center justify-between gap-2">
                      <Button disabled={readOnly} variant={addingTo === id ? "default" : "outline"} className="shrink-0" aria-pressed={addingTo === id} aria-label={t("common.addExercise")} title={t("common.addExercise")} onClick={() => setAddingTo(addingTo === id ? null : id)}><Plus className="size-4" /></Button>
                      <Button
                        className="min-w-0 flex-1 whitespace-normal"
                        onClick={() => startWorkout(id)}
                      >
                        <Play className="size-4 shrink-0" />
                        {done ? t("plannedWorkouts.continueWorkout") : t("plannedWorkouts.startWorkout")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        aria-label={`${t("plannedWorkouts.removeSuggestion")}: ${first.workout?.title}`}
                        title={t("plannedWorkouts.removeSuggestion")}
                        disabled={readOnly}
                        onClick={() => setDeletingId(id)}
                      >
                        <Trash2 className="size-5" />
                      </Button>
                    </div>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plannedWorkouts.removeSuggestedWorkout")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plannedWorkouts.uncompletedExercisesWillBeRemoved")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteProposal();
              }}
            >
              {deleting ? t("common.removing") : t("plannedWorkouts.removeSuggestion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LogSheet
        exercise={entry ? (byCode.get(entry.code) ?? null) : null}
        entry={entry}
        onCompleted={guidedId ? nextExercise : undefined}
        progress={guidedId ? `${guidedDone + 1}/${guidedDone + guidedRows.length}` : undefined}
        onClose={() => {
          setEntry(null);
          setGuidedId(null);
        }}
      />
    </>
  );
}

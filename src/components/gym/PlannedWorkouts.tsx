import { useUserView } from "@/lib/user-view";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { groupByPhase, isWorkoutFinished, workoutSetProgress } from "@/lib/circuit";
import { repsUnit } from "@/lib/reps-unit";
import { PhaseSelect } from "@/components/gym/PhaseSelect";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Play, Trash2, Sparkles, ArrowUp, ArrowDown, X, Plus, Dumbbell } from "lucide-react";
import { ExercisePickList } from "@/components/gym/ExercisePickList";
import { addPlannedExercise, canMove, moveRow, orderedRows, removePlannedRow, setRowPhase } from "@/lib/workout-edit";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removableSuggestionIds } from "@/lib/workout-suggestions";
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
import { CircuitRunner } from "@/components/gym/CircuitRunner";
import { createdStamp } from "@/lib/workout-meta";
import {
  categoriesOf,
  categoryToken,
  exercisesQuery,
  gymsQuery,
  suggestionsQuery,
  formatDateWithWeekday,
  logQuery,
  type LogEntry,
  formatSet,
  todayISO,
  isProposalExpanded,
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
  const [guidedId, setGuidedId] = useState<string | null>(null);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Map<string, boolean>>(new Map());
  const [proposalOverrides, setProposalOverrides] = useState<Map<string, boolean>>(new Map());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const today = todayISO();
  const categories = categoriesOf(exercises);
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const days = new Map<string, LogEntry[]>();
  for (const e of log) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  const planned = new Map<string, LogEntry[]>();
  for (const row of proposals) {
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
    const ids = removableSuggestionIds(proposals, deletingId);
    if (!ids.length) {
      setDeletingId(null);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from("log_entries").delete().in("id", ids).eq("status", "suggested");
      if (error) throw error;
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
  const [circuitId, setCircuitId] = useState<string | null>(null);
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
      {proposals.length > 0 && (
        <section className="space-y-3" aria-label={t("plannedWorkouts.suggestedWorkouts")}>
          <div id="proposed-workouts" className="space-y-3">
            {[...planned].map(([id, unsorted]) => {
              const rows = orderedRows(unsorted);
              const first = rows[0];
              if (!first) return null;
              const { done, total } = workoutSetProgress(id, rows, log);
              if (isWorkoutFinished(done, total)) return null;
              const gym = gyms.find((gym) => gym.id === first.gym_id);
              const open = isProposalExpanded(first.date, today, proposalOverrides, id);
              return (
                <article
                  key={id}
                  className="space-y-3 rounded-lg border-2 border-dashed border-primary bg-secondary p-3"
                >
                  <Button
                    variant="ghost"
                    aria-expanded={open}
                    aria-controls={`proposal-${id}`}
                    onClick={() =>
                      setProposalOverrides((current) =>
                        new Map(current).set(id, !isProposalExpanded(first.date, today, current, id)),
                      )
                    }
                    className="flex h-auto min-h-12 w-full items-start justify-start gap-2 whitespace-normal px-0 py-1 text-left hover:bg-transparent"
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
                  <div id={`proposal-${id}`} hidden={!open} className="space-y-3">
                    {groupByPhase(rows).map((g, gi, all) => <div key={g.phase}>
                    {all.length > 1 && <p className="border-b pb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(`phase.${g.phase}`)} · {g.rows.reduce((n, r) => n + Math.max(1, r.sets), 0)} set</p>}
                    <div className="divide-y divide-border">
                      {g.rows.map((row) => { return (
                        <div key={row.id} data-category={categoryToken(byCode.get(row.code)?.category ?? "", categories)} className="category-theme flex items-center border-l-4 border-category-fill">
                        <Button
                          variant="ghost"
                          className="grid h-auto min-h-12 min-w-0 flex-1 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 whitespace-normal px-2 py-2 text-left sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
                          onClick={() => {
                            setGuidedId(null);
                            setEntry(row);
                          }}
                        >
                          <span className="font-bold text-category-ink">{row.code}</span>
                          <span className="min-w-0 break-words">{byCode.get(row.code)?.name}</span>
                          <span className="col-start-2 min-w-0 break-words text-sm font-semibold sm:col-start-auto">
                            {byCode.get(row.code)?.equipment ? <span className="font-normal text-muted-foreground">{byCode.get(row.code)?.equipment} · </span> : null}
                            {formatSet(row, repsUnit(exercises.find((e) => e.code === row.code)) === "reps" ? "" : t(`repsUnit.${repsUnit(exercises.find((e) => e.code === row.code))}`).toLowerCase())}
                          </span>
                        </Button>
                        <PhaseSelect value={row.phase} disabled={readOnly || editBusy} onChange={(ph) => void edit(() => setRowPhase(row.id, ph))} />
                        <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={readOnly || editBusy || !canMove(rows, row.id, -1)} aria-label={t("common.moveUp")} onClick={() => void edit(() => moveRow(rows, row.id, -1))}><ArrowUp className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0" disabled={readOnly || editBusy || !canMove(rows, row.id, 1)} aria-label={t("common.moveDown")} onClick={() => void edit(() => moveRow(rows, row.id, 1))}><ArrowDown className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-destructive" disabled={readOnly || editBusy} aria-label={`${t("common.remove")} ${row.code}`} onClick={async () => { if (await confirmDialog(t("plannedWorkouts.removeFromTheWorkout", { code: row.code }))) void edit(() => removePlannedRow(row.id)); }}><X className="size-4" /></Button>
                        </div>
                      ); })}
                    </div>
                    </div>)}
                    {addingTo === id && <ExercisePickList exercises={exercisesAtLocation(exercises.filter((e) => e.is_active), links, first.gym_id)} disabled={readOnly || editBusy} onPick={(e, ph) => void edit(async () => { await addPlannedExercise(id, e.code, rows, first.gym_id, lastDone.get(e.code)?.load ?? "", Math.max(1, ...rows.map((r) => r.sets)), lastDone.get(e.code)?.reps ?? 10, ph); setAddingTo(null); })} />}
                    <div className="flex items-center justify-between gap-2">
                      <Button disabled={readOnly} variant={addingTo === id ? "default" : "outline"} className="shrink-0" aria-pressed={addingTo === id} aria-label={t("common.addExercise")} title={t("common.addExercise")} onClick={() => setAddingTo(addingTo === id ? null : id)}><Plus className="size-4" /><Dumbbell className="size-4" /></Button>
                      <Button
                        className="min-w-0 flex-1 whitespace-normal"
                        onClick={() => setCircuitId(id)}
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
                    </div>
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
      {circuitId && (
        <CircuitRunner workoutId={circuitId} onClose={() => setCircuitId(null)} />
      )}
    </>
  );
}

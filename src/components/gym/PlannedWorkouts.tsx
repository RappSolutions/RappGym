import { isWorkoutFinished, workoutSetProgress } from "@/lib/circuit";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Play, Circle, Trash2, Sparkles } from "lucide-react";
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
} from "@/lib/gym";

/** Planned (suggested) workouts: encouragement and how-to, kept apart from the factual Log. */
export function PlannedWorkouts() {
  const { t, language, localize } = useLanguage();
  const queryClient = useQueryClient();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const { data: proposals } = useSuspenseQuery(suggestionsQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [guidedId, setGuidedId] = useState<string | null>(null);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [expandedOverrides, setExpandedOverrides] = useState<Map<string, boolean>>(new Map());
  const [proposalOverrides, setProposalOverrides] = useState<Map<string, boolean>>(new Map());
  const [proposalsExpanded, setProposalsExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(true);
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
    if (!deletingId || deleting) return;
    const all = deletingId === "__all__";
    const ids = all
      ? proposals.filter((row) => row.status === "suggested").map((row) => row.id)
      : removableSuggestionIds(proposals, deletingId);
    if (!ids.length) {
      setDeletingId(null);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from("log_entries").delete().in("id", ids).eq("status", "suggested");
      if (error) throw error;
      if (all || guidedId === deletingId) {
        setGuidedId(null);
        setEntry(null);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }),
        queryClient.invalidateQueries({ queryKey: ["accepted-ai-workouts"] }),
      ]);
      setDeletingId(null);
      toast.success(
        all ? t("Alla förslag borttagna", "All suggestions removed") : t("Förslaget borttaget", "Suggestion removed"),
      );
    } catch {
      toast.error(t("Förslaget kunde inte tas bort. Försök igen.", "Could not remove suggestion. Try again."));
    } finally {
      setDeleting(false);
    }
  }
  const [circuitId, setCircuitId] = useState<string | null>(null);
  return (
    <>
      {proposals.length > 0 && (
        <section
          className="space-y-3 border-b border-border pb-5"
          aria-label={t("Föreslagna pass", "Suggested workouts")}
        >
          <Button
            variant="ghost"
            className="h-auto min-h-12 w-full justify-start gap-2 whitespace-normal px-0 text-left"
            aria-expanded={proposalsExpanded}
            aria-controls="proposed-workouts"
            onClick={() => setProposalsExpanded(!proposalsExpanded)}
          >
            {proposalsExpanded ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
            <Circle className="size-5 shrink-0 text-primary" />
            <span className="font-display text-2xl font-bold">{t("Planerade pass", "Planned workouts")}</span>
            <span className="ml-auto text-sm text-muted-foreground">{planned.size}</span>
          </Button>
          {proposalsExpanded && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingId("__all__")}>
              <Trash2 className="size-4" />
              {t("Ta bort alla förslag", "Delete all suggestions")}
            </Button>
          )}
          <div id="proposed-workouts" hidden={!proposalsExpanded} className="space-y-3">
            {[...planned].map(([id, rows]) => {
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
                    className="h-auto min-h-12 w-full flex-wrap items-start justify-between gap-2 whitespace-normal px-0 py-1 text-left hover:bg-transparent"
                  >
                    <span className="flex min-w-0 items-start gap-2 text-left">
                      {open ? (
                        <ChevronDown className="mt-1.5 size-4 shrink-0" />
                      ) : (
                        <ChevronRight className="mt-1.5 size-4 shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block text-xl font-bold">
                          {first.workout?.title}
                          {first.workout?.created_by === "ai" && (
                            <Sparkles className="ml-1 inline size-4 text-primary" aria-label="AI" />
                          )}
                        </span>
                        <span className="block text-sm">
                          {formatDateWithWeekday(first.date, language)}
                          {gym ? ` · ${gym.name}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-medium">
                      {done}/{total} {t("set klara", "sets done")}
                    </span>
                  </Button>
                  <div id={`proposal-${id}`} hidden={!open} className="space-y-3">
                    <div className="divide-y divide-border">
                      {rows.map((row) => (
                        <Button
                          key={row.id}
                          variant="ghost"
                          data-category={categoryToken(byCode.get(row.code)?.category ?? "", categories)}
                          className="category-theme grid h-auto min-h-12 w-full grid-cols-[1rem_2.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 whitespace-normal border-l-4 border-category-fill px-2 py-3 text-left sm:grid-cols-[1rem_2.5rem_minmax(0,1fr)_auto]"
                          onClick={() => {
                            setGuidedId(null);
                            setEntry(row);
                          }}
                        >
                          <Circle className="size-4 shrink-0 text-primary" />
                          <span className="font-bold text-category-ink">{row.code}</span>
                          <span className="min-w-0 break-words">{byCode.get(row.code)?.name}</span>
                          <span className="col-span-2 col-start-2 min-w-0 break-words font-semibold sm:col-span-1 sm:col-start-auto">
                            {formatSet(row)}
                          </span>
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        className="min-w-0 flex-1 whitespace-normal sm:flex-none"
                        onClick={() => setCircuitId(id)}
                      >
                        <Play className="size-4 shrink-0" />
                        {done ? t("Fortsätt passet", "Continue workout") : t("Starta passet", "Start workout")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        aria-label={`${t("Ta bort förslag", "Remove suggestion")}: ${first.workout?.title}`}
                        title={t("Ta bort förslag", "Remove suggestion")}
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
            <AlertDialogTitle>
              {deletingId === "__all__"
                ? t(`Ta bort alla ${planned.size} föreslagna pass?`, `Remove all ${planned.size} suggested workouts?`)
                : t("Ta bort föreslaget pass?", "Remove suggested workout?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Ej genomförda övningar tas bort. Genomförda övningar och AI-svaret i historiken behålls.",
                "Uncompleted exercises will be removed. Completed exercises and the AI answer in history are kept.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("Avbryt", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteProposal();
              }}
            >
              {deleting
                ? t("Tar bort…", "Removing…")
                : deletingId === "__all__"
                  ? t("Ta bort alla", "Delete all")
                  : t("Ta bort förslag", "Remove suggestion")}
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
        <CircuitRunner rows={planned.get(circuitId) ?? []} names={byCode} onClose={() => setCircuitId(null)} />
      )}
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Play, Circle, CheckCircle2, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removableSuggestionIds } from "@/lib/workout-suggestions";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";
import { LogSheet } from "@/components/gym/LogSheet";
import { categoriesOf, categoryToken, exercisesQuery, gymsQuery, suggestionsQuery, formatDateWithWeekday, logQuery, type LogEntry, formatSet, todayISO, isWorkoutExpanded, isProposalExpanded, workoutRecordingOrder } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Logg – RappGym" },
      { name: "description", content: "Alla dina pass, dag för dag." },
      { property: "og:title", content: "Logg – RappGym" },
      { property: "og:description", content: "Alla dina pass, dag för dag." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(suggestionsQuery), context.queryClient.ensureQueryData(gymsQuery)]),
  component: LogPage,
});

function LogPage() {
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
    const key = row.proposal_id ?? row.id;
    planned.set(key, [...(planned.get(key) ?? []), row]);
  }
  const guidedRows = guidedId ? planned.get(guidedId) ?? [] : [];
  const guidedDone = guidedId ? log.filter((row) => row.proposal_id === guidedId).length : 0;
  function nextExercise() {
    const next = guidedRows.find((row) => row.id !== entry?.id);
    if (next) setEntry(next);
    else { setEntry(null); setGuidedId(null); }
  }

  async function deleteProposal() {
    if (!deletingId || deleting) return;
    const all = deletingId === "__all__";
    const ids = all ? proposals.filter((row) => row.status === "suggested").map((row) => row.id) : removableSuggestionIds(proposals, deletingId);
    if (!ids.length) { setDeletingId(null); return; }
    setDeleting(true);
    try {
      const { error } = await supabase.from("log_entries").delete().in("id", ids).eq("status", "suggested");
      if (error) throw error;
      if (all || guidedId === deletingId) { setGuidedId(null); setEntry(null); }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }), queryClient.invalidateQueries({ queryKey: ["accepted-ai-workouts"] })]);
      setDeletingId(null);
      toast.success(all ? t("Alla förslag borttagna", "All suggestions removed") : t("Förslaget borttaget", "Suggestion removed"));
    } catch { toast.error(t("Förslaget kunde inte tas bort. Försök igen.", "Could not remove suggestion. Try again.")); }
    finally { setDeleting(false); }
  }

       </section>}
       {log.length > 0 && <Button variant="ghost" className="h-auto min-h-12 w-full justify-start gap-2 whitespace-normal px-0 text-left" aria-expanded={completedExpanded} aria-controls="completed-workouts" onClick={() => setCompletedExpanded(!completedExpanded)}>{completedExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}<CheckCircle2 className="size-5 shrink-0 text-primary" /><span className="font-display text-2xl font-bold">{t("Genomförda pass", "Completed workouts")}</span><span className="ml-auto text-sm text-muted-foreground">{days.size}</span></Button>}
      {!log.length && <p className="text-muted-foreground">{t("Inga pass ännu.", "No workouts yet.")}</p>}
       <div id="completed-workouts" hidden={!completedExpanded} className="space-y-5">{[...days].map(([date, entries]) => {
        const cats = [...new Set(entries.map((e) => exercises.find((ex) => ex.code === e.code)?.category).filter((c): c is string => !!c))];
        const expanded = isWorkoutExpanded(date, today, expandedOverrides);
        return (
          <section key={date} className="space-y-1">
            <Button variant="ghost" aria-expanded={expanded} aria-controls={`workout-${date}`} onClick={() => setExpandedOverrides((current) => new Map(current).set(date, !isWorkoutExpanded(date, today, current)))} className="h-auto min-h-12 w-full flex-wrap justify-between gap-2 whitespace-normal px-0 text-left">
              <span className="flex items-center gap-2 font-display text-xl font-bold uppercase">{expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}{formatDateWithWeekday(date, language)}</span>
              <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right text-xs text-muted-foreground">
                {cats.map((cat) => {
                  const exercise = exercises.find((ex) => ex.category === cat);
                  return <span key={cat} data-category={categoryToken(cat, categories)} className="category-theme inline-flex items-center gap-1 font-semibold text-category-ink"><span className="size-2 shrink-0 rounded-full bg-category-fill" />{exercise ? localize(exercise).category : cat}</span>;
                })}
                <span>{entries.reduce((n, x) => n + (x.sets ?? 1), 0)} {t("set", "sets")}</span>
                {(() => { const names = [...new Set(entries.map((x) => gyms.find((g) => g.id === x.gym_id)?.name ?? t("Ingen plats", "No location")))]; return <span className="inline-flex items-center gap-1 font-semibold text-foreground"><MapPin className="size-3" />{names.join(", ")}</span>; })()}
              </span>
            </Button>
            <div id={`workout-${date}`} hidden={!expanded} className="divide-y rounded-xl border bg-card">
              {workoutRecordingOrder(entries).map((e) => (
                <Button variant="ghost" key={e.id} data-category={categoryToken(exercises.find((ex) => ex.code === e.code)?.category ?? "", categories)} onClick={() => setEntry(e)} className="category-theme flex h-auto w-full items-center gap-3 whitespace-normal border-l-4 border-category-fill px-3 py-2.5 text-left">
                  <span className="w-12 shrink-0 font-bold text-category-ink">{e.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{byCode.get(e.code)?.name ?? t("Okänd övning", "Unknown exercise")}</span>
                    {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                  </span>
                  {new Set(entries.map((x) => x.gym_id)).size > 1 && <span className="hidden text-xs text-muted-foreground sm:inline">{gyms.find((g) => g.id === e.gym_id)?.name}</span>}
                  <span className="text-lg font-bold">{formatSet(e)}</span>
                </Button>
              ))}
            </div>
          </section>
        );
      })}</div>
      <LogSheet exercise={entry ? byCode.get(entry.code) ?? null : null} entry={entry} onCompleted={guidedId ? nextExercise : undefined} progress={guidedId ? `${guidedDone + 1}/${guidedDone + guidedRows.length}` : undefined} onClose={() => { setEntry(null); setGuidedId(null); }} />
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Play, Circle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { removableSuggestionIds } from "@/lib/workout-suggestions";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";
import { LogSheet } from "@/components/gym/LogSheet";
import { categoriesOf, categoryToken, exercisesQuery, gymsQuery, suggestionsQuery, formatDateWithWeekday, logQuery, type LogEntry, formatSet, todayISO, isWorkoutExpanded, workoutRecordingOrder } from "@/lib/gym";

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
    const ids = removableSuggestionIds(proposals, deletingId);
    if (!ids.length) { setDeletingId(null); return; }
    setDeleting(true);
    try {
      const { error } = await supabase.from("log_entries").delete().in("id", ids).eq("status", "suggested");
      if (error) throw error;
      if (guidedId === deletingId) { setGuidedId(null); setEntry(null); }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }), queryClient.invalidateQueries({ queryKey: ["accepted-ai-workouts"] })]);
      setDeletingId(null);
      toast.success(t("Förslaget borttaget", "Suggestion removed"));
    } catch { toast.error(t("Förslaget kunde inte tas bort. Försök igen.", "Could not remove suggestion. Try again.")); }
    finally { setDeleting(false); }
  }

  return (
    <main className="space-y-5 px-4">
      <p className="text-sm text-muted-foreground">{t("Logg: allt du har tränat, per datum, plus sparade passförslag.", "Log: everything you have trained, by date, plus saved workout suggestions.")}</p>
      {proposals.length > 0 && <section className="space-y-3 border-b border-border pb-5" aria-label={t("Föreslagna pass", "Suggested workouts")}>
        <Button variant="ghost" className="h-auto min-h-12 w-full justify-start gap-2 whitespace-normal px-0 text-left" aria-expanded={proposalsExpanded} aria-controls="proposed-workouts" onClick={() => setProposalsExpanded(!proposalsExpanded)}>{proposalsExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}<Circle className="size-5 shrink-0 text-primary" /><span className="font-display text-2xl font-bold">{t("Föreslagna pass", "Suggested workouts")}</span><span className="ml-auto text-sm text-muted-foreground">{planned.size}</span></Button>
        <div id="proposed-workouts" hidden={!proposalsExpanded} className="space-y-3">
        {[...planned].map(([id, rows]) => {
          const first = rows[0];
          if (!first) return null;
          const done = log.filter((row) => row.proposal_id === id).length;
          const gym = gyms.find((gym) => gym.id === first.gym_id);
          return <article key={id} className="space-y-3 rounded-lg border-2 border-dashed border-primary bg-secondary p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><span className="font-semibold text-primary">{t("Förslag", "Suggestion")}</span><h3 className="text-xl font-bold">{first.proposal_title}</h3><p className="text-sm">{formatDateWithWeekday(first.date, language)}{gym ? ` · ${gym.name}` : ""}</p></div>
              <span className="text-sm font-medium">{done}/{done + rows.length} {t("övningar genomförda", "exercises completed")}</span>
            </div>
            <div className="divide-y divide-border">{rows.map((row) => <Button key={row.id} variant="ghost" data-category={categoryToken(byCode.get(row.code)?.category ?? "", categories)} className="category-theme grid h-auto min-h-12 w-full grid-cols-[1rem_2.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 whitespace-normal border-l-4 border-category-fill px-2 py-3 text-left sm:grid-cols-[1rem_2.5rem_minmax(0,1fr)_auto]" onClick={() => { setGuidedId(null); setEntry(row); }}>
              <Circle className="size-4 shrink-0 text-primary" /><span className="font-bold text-category-ink">{row.code}</span><span className="min-w-0 break-words">{byCode.get(row.code)?.name}</span><span className="col-span-2 col-start-2 min-w-0 break-words font-semibold sm:col-span-1 sm:col-start-auto">{formatSet(row)}</span>
            </Button>)}</div>
             <div className="flex items-center justify-between gap-2"><Button className="min-w-0 whitespace-normal sm:w-auto" onClick={() => { setGuidedId(id); setEntry(first); }}><Play className="size-4 shrink-0" />{done ? t("Fortsätt passet", "Continue workout") : t("Gå igenom passet", "Start workout")}</Button><Button variant="ghost" size="icon" className="shrink-0 text-destructive" aria-label={`${t("Ta bort förslag", "Remove suggestion")}: ${first.proposal_title}`} title={t("Ta bort förslag", "Remove suggestion")} onClick={() => setDeletingId(id)}><Trash2 className="size-5" /></Button></div>
          </article>;
        })}
        </div>
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
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open && !deleting) setDeletingId(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Ta bort föreslaget pass?", "Remove suggested workout?")}</AlertDialogTitle><AlertDialogDescription>{t("Ej genomförda övningar i detta förslag tas bort. Genomförda övningar och AI-svaret i historiken behålls.", "Uncompleted exercises in this suggestion will be removed. Completed exercises and the AI answer in history are kept.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>{t("Avbryt", "Cancel")}</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={(event) => { event.preventDefault(); void deleteProposal(); }}>{deleting ? t("Tar bort…", "Removing…") : t("Ta bort förslag", "Remove suggestion")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <LogSheet exercise={entry ? byCode.get(entry.code) ?? null : null} entry={entry} onCompleted={guidedId ? nextExercise : undefined} progress={guidedId ? `${guidedDone + 1}/${guidedDone + guidedRows.length}` : undefined} onClose={() => { setEntry(null); setGuidedId(null); }} />
    </main>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, Trash2, MapPin, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";
import { LogSheet } from "@/components/gym/LogSheet";
import { groupLogByWorkout, replanRows } from "@/lib/log-workouts";
import { categoriesOf, categoryToken, exercisesQuery, gymsQuery, formatDateWithWeekday, logQuery, type LogEntry, formatSet, todayISO, workoutRecordingOrder } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Logg – RappGym" },
      { name: "description", content: "Alla dina genomförda pass, pass för pass." },
      { property: "og:title", content: "Logg – RappGym" },
      { property: "og:description", content: "Alla dina genomförda pass, pass för pass." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(gymsQuery)]),
  component: LogPage,
});

type Group = ReturnType<typeof groupLogByWorkout<LogEntry>>[number];

function LogPage() {
  const { t, language, localize } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [entry, setEntry] = useState<LogEntry | null>(null);
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());
  const [deleting, setDeleting] = useState<Group | null>(null);
  const [busy, setBusy] = useState(false);
  const today = todayISO();
  const categories = categoriesOf(exercises);
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const groups = groupLogByWorkout(log);
  const titleOf = (g: Group) => g.entries[0]?.workout?.title ?? t("Enskilda övningar", "Single exercises");
  const isOpen = (g: Group) => overrides.get(g.key) ?? g.date === today;

  async function replan(g: Group) {
    if (busy) return;
    setBusy(true);
    try {
      const gymId = g.entries.find((e) => e.gym_id)?.gym_id ?? null;
      const head = await supabase.from("workouts").insert({ title: g.workoutId ? titleOf(g) : `${t("Pass", "Workout")} ${g.date}`, created_by: "user", scheduled_date: today, gym_id: gymId, is_circuit: g.entries[0]?.workout?.is_circuit ?? true, source_workout_id: g.workoutId }).select("id").single();
      if (head.error) throw head.error;
      const rows = replanRows(g.entries).map((r, index) => ({ ...r, date: today, gym_id: gymId, status: "suggested", workout_id: head.data.id, proposal_order: index }));
      const { error } = await supabase.from("log_entries").insert(rows);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] });
      toast.success(t("Passet är planerat för idag under Träna", "Workout planned for today under Train"));
      void navigate({ to: "/workout" });
    } catch { toast.error(t("Kunde inte planera passet igen.", "Could not plan the workout again.")); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("log_entries").delete().in("id", deleting.entries.map((e) => e.id));
      if (error) throw error;
      if (deleting.workoutId) {
        const { count } = await supabase.from("log_entries").select("id", { count: "exact", head: true }).eq("workout_id", deleting.workoutId);
        if (!count) await supabase.from("workouts").delete().eq("id", deleting.workoutId);
      }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["log"] }), queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] })]);
      setDeleting(null);
      toast.success(t("Passet borttaget från loggen", "Workout removed from the log"));
    } catch { toast.error(t("Passet kunde inte tas bort. Försök igen.", "Could not remove the workout. Try again.")); }
    finally { setBusy(false); }
  }

  return (
    <main className="space-y-5 px-4">
      <p className="text-sm text-muted-foreground">{t("Logg: allt du har genomfört, pass för pass. Planerade pass finns under Träna.", "Log: everything you have completed, workout by workout. Planned workouts live under Train.")}</p>
      {log.length > 0 && <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><CheckCircle2 className="size-5 text-primary" />{t("Genomförda pass", "Completed workouts")}<span className="ml-auto font-sans text-sm font-normal text-muted-foreground">{groups.length}</span></h2>}
      {!log.length && <p className="text-muted-foreground">{t("Inga pass ännu.", "No workouts yet.")}</p>}
      <div className="space-y-4">{groups.map((g) => {
        const entries = workoutRecordingOrder(g.entries);
        const cats = [...new Set(entries.map((e) => exercises.find((ex) => ex.code === e.code)?.category).filter((c): c is string => !!c))];
        const open = isOpen(g);
        const places = [...new Set(entries.map((x) => gyms.find((gym) => gym.id === x.gym_id)?.name ?? t("Ingen plats", "No location")))];
        const sets = entries.reduce((n, x) => n + (x.sets ?? 1), 0);
        return (
          <section key={g.key} className="rounded-xl border bg-card">
            <div className="flex items-start gap-1 p-2">
              <Button variant="ghost" aria-expanded={open} aria-controls={`workout-${g.key}`} onClick={() => setOverrides((m) => new Map(m).set(g.key, !open))} className="h-auto min-h-12 min-w-0 flex-1 justify-start gap-2 whitespace-normal px-1 text-left">
                {open ? <ChevronDown className="mt-1 size-4 shrink-0 self-start" /> : <ChevronRight className="mt-1 size-4 shrink-0 self-start" />}
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-bold">{titleOf(g)}{g.entries[0]?.workout?.created_by === "ai" && <Sparkles className="ml-1 inline size-4 text-primary" aria-label="AI" />}</span>
                  <span className="block text-sm">{formatDateWithWeekday(g.date, language)} · {sets} {t("set", "sets")} · <MapPin className="inline size-3" /> {places.join(", ")}</span>
                  <span className="mt-1 flex flex-wrap gap-x-2 text-xs">{cats.map((cat) => { const ex = exercises.find((e) => e.category === cat); return <span key={cat} data-category={categoryToken(cat, categories)} className="category-theme inline-flex items-center gap-1 font-semibold text-category-ink"><span className="size-2 rounded-full bg-category-fill" />{ex ? localize(ex).category : cat}</span>; })}</span>
                </span>
              </Button>
              <Button variant="ghost" size="icon" disabled={busy} title={t("Planera igen", "Plan again")} aria-label={`${t("Planera igen", "Plan again")}: ${titleOf(g)}`} onClick={() => void replan(g)}><Repeat className="size-5" /></Button>
              <Button variant="ghost" size="icon" disabled={busy} className="text-destructive" title={t("Ta bort pass", "Remove workout")} aria-label={`${t("Ta bort pass", "Remove workout")}: ${titleOf(g)}`} onClick={() => setDeleting(g)}><Trash2 className="size-5" /></Button>
            </div>
            <div id={`workout-${g.key}`} hidden={!open} className="divide-y border-t">
              {entries.map((e) => (
                <Button variant="ghost" key={e.id} data-category={categoryToken(exercises.find((ex) => ex.code === e.code)?.category ?? "", categories)} onClick={() => setEntry(e)} className="category-theme flex h-auto w-full items-center gap-3 whitespace-normal rounded-none border-l-4 border-category-fill px-3 py-2.5 text-left">
                  <span className="w-12 shrink-0 font-bold text-category-ink">{e.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{byCode.get(e.code)?.name ?? t("Okänd övning", "Unknown exercise")}</span>
                    {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                  </span>
                  <span className="text-lg font-bold">{formatSet(e)}</span>
                </Button>
              ))}
            </div>
          </section>
        );
      })}</div>
      <AlertDialog open={deleting !== null} onOpenChange={(o) => { if (!o && !busy) setDeleting(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Ta bort passet från loggen?", "Remove the workout from the log?")}</AlertDialogTitle><AlertDialogDescription>{deleting && t(`${titleOf(deleting)} (${deleting.date}): ${deleting.entries.length} loggade rader tas bort permanent.`, `${titleOf(deleting)} (${deleting.date}): ${deleting.entries.length} logged rows will be permanently removed.`)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>{t("Avbryt", "Cancel")}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(ev) => { ev.preventDefault(); void remove(); }}>{busy ? t("Tar bort…", "Removing…") : t("Ta bort", "Remove")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <LogSheet exercise={entry ? byCode.get(entry.code) ?? null : null} entry={entry} onClose={() => setEntry(null)} />
    </main>
  );
}

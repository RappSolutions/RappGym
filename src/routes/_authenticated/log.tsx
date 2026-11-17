import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, Trash2, Repeat, Sparkles } from "lucide-react";
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogDatePicker } from "@/components/gym/LogDatePicker";
import { createdStamp } from "@/lib/workout-meta";
import { groupLogByWorkout, replanRows } from "@/lib/log-workouts";
import {
  categoriesOf,
  categoryToken,
  exercisesQuery,
  gymsQuery,
  formatDateWithWeekday,
  logQuery,
  type LogEntry,
  formatSet,
  todayISO,
  workoutRecordingOrder,
} from "@/lib/gym";

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
    Promise.all([
      context.queryClient.ensureQueryData(exercisesQuery),
      context.queryClient.ensureQueryData(logQuery),
      context.queryClient.ensureQueryData(gymsQuery),
    ]),
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
  const [copying, setCopying] = useState<Group | null>(null);
  const [form, setForm] = useState({ title: "", date: "", gymId: "", circuit: true });
  const today = todayISO();
  const categories = categoriesOf(exercises);
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const groups = groupLogByWorkout(log);
  const titleOf = (g: Group) => g.entries[0]?.workout?.title ?? t("Enskilda övningar", "Single exercises");
  const isOpen = (g: Group) => overrides.get(g.key) ?? g.date === today;

  function openCopy(g: Group) {
    setForm({
      title: g.workoutId ? titleOf(g) : `${t("Pass", "Workout")} ${g.date}`,
      date: today,
      gymId: g.entries.find((e) => e.gym_id)?.gym_id ?? "",
      circuit: g.entries[0]?.workout?.is_circuit ?? true,
    });
    setCopying(g);
  }

  async function replan() {
    const g = copying;
    if (busy || !g) return;
    setBusy(true);
    try {
      const gymId = form.gymId || null;
      const head = await supabase
        .from("workouts")
        .insert({
          title: form.title.trim(),
          created_by: "user",
          scheduled_date: form.date,
          gym_id: gymId,
          is_circuit: form.circuit,
          source_workout_id: g.workoutId,
        })
        .select("id")
        .single();
      if (head.error) throw head.error;
      const rows = replanRows(g.entries).map((r, index) => ({
        ...r,
        date: form.date,
        gym_id: gymId,
        status: "suggested",
        workout_id: head.data.id,
        proposal_order: index,
      }));
      const { error } = await supabase.from("log_entries").insert(rows);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] });
      setCopying(null);
      toast.success(t(`Planerat ${form.date} under Pass`, `Planned ${form.date} under Workouts`));
      void navigate({ to: "/workout" });
    } catch {
      toast.error(t("Kunde inte planera passet igen.", "Could not plan the workout again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("log_entries")
        .delete()
        .in(
          "id",
          deleting.entries.map((e) => e.id),
        );
      if (error) throw error;
      if (deleting.workoutId) {
        const { count } = await supabase
          .from("log_entries")
          .select("id", { count: "exact", head: true })
          .eq("workout_id", deleting.workoutId);
        if (!count) await supabase.from("workouts").delete().eq("id", deleting.workoutId);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["log"] }),
        queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }),
      ]);
      setDeleting(null);
      toast.success(t("Passet borttaget från loggen", "Workout removed from the log"));
    } catch {
      toast.error(t("Passet kunde inte tas bort. Försök igen.", "Could not remove the workout. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-5 px-4">
      {!log.length && <p className="text-muted-foreground">{t("Inga pass ännu.", "No workouts yet.")}</p>}
      <Drawer
        open={!!copying}
        onOpenChange={(o) => {
          if (!o && !busy) setCopying(null);
        }}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg space-y-3 px-4 pb-6">
            <DrawerHeader className="px-0">
              <DrawerTitle className="font-display text-2xl">{t("Planera igen", "Plan again")}</DrawerTitle>
              <DrawerDescription>
                {t("Kopieras som planerat pass under Pass.", "Copied as a planned workout under Workouts.")}
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-1">
              <Label htmlFor="copy-title">{t("Namn", "Name")}</Label>
              <Input
                id="copy-title"
                className="h-12"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="log-date">{t("Datum", "Date")}</Label>
                <LogDatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="copy-gym">{t("Plats", "Location")}</Label>
                <select
                  id="copy-gym"
                  className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.gymId}
                  onChange={(e) => setForm({ ...form, gymId: e.target.value })}
                >
                  <option value="">{t("Ingen plats", "No location")}</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>{t("Kör som cirkel", "Run as circuit")}</span>
              <Switch checked={form.circuit} onCheckedChange={(circuit) => setForm({ ...form, circuit })} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setCopying(null)}>
                {t("Avbryt", "Cancel")}
              </Button>
              <Button disabled={busy || !form.title.trim() || !form.date} onClick={() => void replan()}>
                {t("Planera", "Plan")}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <div className="space-y-4">
        {groups.map((g) => {
          const entries = workoutRecordingOrder(g.entries);
          const cats = [
            ...new Set(
              entries.map((e) => exercises.find((ex) => ex.code === e.code)?.category).filter((c): c is string => !!c),
            ),
          ];
          const open = isOpen(g);
          const places = [
            ...new Set(
              entries.map((x) => gyms.find((gym) => gym.id === x.gym_id)?.name ?? t("Ingen plats", "No location")),
            ),
          ];
          const sets = entries.reduce((n, x) => n + (x.sets ?? 1), 0);
          return (
            <section key={g.key} className="rounded-xl border bg-card">
              <div className="flex items-start gap-1 p-2">
                <Button
                  variant="ghost"
                  aria-expanded={open}
                  aria-controls={`workout-${g.key}`}
                  onClick={() => setOverrides((m) => new Map(m).set(g.key, !open))}
                  className="h-auto min-h-12 min-w-0 flex-1 justify-start gap-2 whitespace-normal px-1 text-left"
                >
                  {open ? (
                    <ChevronDown className="mt-1 size-4 shrink-0 self-start" />
                  ) : (
                    <ChevronRight className="mt-1 size-4 shrink-0 self-start" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold">
                      {titleOf(g)}
                      {g.entries[0]?.workout?.created_by === "ai" && (
                        <Sparkles className="ml-1 inline size-4 text-primary" aria-label="AI" />
                      )}
                    </span>
                    <span className="block text-sm">
                      {formatDateWithWeekday(g.date, language)} · {sets} {t("set", "sets")} · {places.join(", ")}
                      {g.entries[0]?.workout && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          · {createdStamp(g.entries[0].workout.created_at)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-2 text-xs">
                      {cats.map((cat) => {
                        const ex = exercises.find((e) => e.category === cat);
                        return (
                          <span
                            key={cat}
                            data-category={categoryToken(cat, categories)}
                            className="category-theme inline-flex items-center gap-1 font-semibold text-category-ink"
                          >
                            <span className="size-2 rounded-full bg-category-fill" />
                            {ex ? localize(ex).category : cat}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  title={t("Planera igen", "Plan again")}
                  aria-label={`${t("Planera igen", "Plan again")}: ${titleOf(g)}`}
                  onClick={() => openCopy(g)}
                >
                  <Repeat className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  className="text-destructive"
                  title={t("Ta bort pass", "Remove workout")}
                  aria-label={`${t("Ta bort pass", "Remove workout")}: ${titleOf(g)}`}
                  onClick={() => setDeleting(g)}
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
              <div id={`workout-${g.key}`} hidden={!open} className="divide-y border-t">
                {entries.map((e) => (
                  <Button
                    variant="ghost"
                    key={e.id}
                    data-category={categoryToken(
                      exercises.find((ex) => ex.code === e.code)?.category ?? "",
                      categories,
                    )}
                    onClick={() => setEntry(e)}
                    className="category-theme flex h-auto w-full items-center gap-3 whitespace-normal rounded-none border-l-4 border-category-fill px-3 py-2.5 text-left"
                  >
                    <span className="w-12 shrink-0 font-bold text-category-ink">{e.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {byCode.get(e.code)?.name ?? t("Okänd övning", "Unknown exercise")}
                      </span>
                      {e.note && <span className="block truncate text-xs text-muted-foreground">{e.note}</span>}
                    </span>
                    <span className="text-lg font-bold">{formatSet(e)}</span>
                  </Button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Ta bort passet från loggen?", "Remove the workout from the log?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                t(
                  `${titleOf(deleting)} (${deleting.date}): ${deleting.entries.length} loggade rader tas bort permanent.`,
                  `${titleOf(deleting)} (${deleting.date}): ${deleting.entries.length} logged rows will be permanently removed.`,
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("Avbryt", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(ev) => {
                ev.preventDefault();
                void remove();
              }}
            >
              {busy ? t("Tar bort…", "Removing…") : t("Ta bort", "Remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <LogSheet
        exercise={entry ? (byCode.get(entry.code) ?? null) : null}
        entry={entry}
        onClose={() => setEntry(null)}
      />
    </main>
  );
}

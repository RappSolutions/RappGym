import { useUserView } from "@/lib/user-view";
import { insertPlannedExercises } from "@/lib/workout-edit";
import type { RepsUnit } from "@/lib/reps-unit";
import { loggedName } from "@/lib/log-entry";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState } from "react";
import { logSectionHeaders } from "@/lib/runner-state";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, Trash2, Repeat, Sparkles, LayoutList, Rows3, Pencil, FileSpreadsheet } from "lucide-react";
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
import { RatingMark } from "@/components/gym/RatingPicker";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogDatePicker } from "@/components/gym/LogDatePicker";
import { createdStamp } from "@/lib/workout-meta";
import { downloadLogXlsx, LOG_EXPORT_COLUMNS, logExportRows } from "@/lib/workout-export";
import { buildLogReport, REPORT_COLUMNS } from "@/lib/log-report";
import { groupLogByWorkout, replanRows } from "@/lib/log-workouts";
import { formatTonnage, tonnageSummary } from "@/lib/tonnage";
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
  const { readOnly } = useUserView();
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
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  async function saveRename() {
    if (readOnly || !renaming || !renaming.title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("workouts").update({ title: renaming.title.trim() }).eq("id", renaming.id);
    setBusy(false);
    if (error) { toast.error(t("log.couldNotRename")); return; }
    setRenaming(null);
    await queryClient.invalidateQueries({ queryKey: ["log"] });
  }
  const [form, setForm] = useState({ title: "", date: "", gymId: "", circuit: true });
  const [compact, setCompact] = useState(false);
  useEffect(() => setCompact(localStorage.getItem("rappgym-log-view") === "compact"), []);
  function chooseView(c: boolean) {
    setCompact(c);
    localStorage.setItem("rappgym-log-view", c ? "compact" : "cards");
  }
  const today = todayISO();
  const categories = categoriesOf(exercises);
  const byCode = new Map(exercises.map((e) => [e.code, localize(e)]));
  const rawByCode = new Map(exercises.map((e) => [e.code, e]));
  const groups = groupLogByWorkout(log);
  const titleOf = (g: Group) => g.entries[0]?.workout?.title ?? t("log.singleExercises");
  const isOpen = (g: Group) => overrides.get(g.key) ?? g.date === today;

  function openCopy(g: Group) {
    setForm({
      title: g.workoutId ? titleOf(g) : `${t("common.workout")} ${g.date}`,
      date: today,
      gymId: g.entries.find((e) => e.gym_id)?.gym_id ?? "",
      circuit: g.entries[0]?.workout?.is_circuit ?? true,
    });
    setCopying(g);
  }

  async function replan() {
    const g = copying;
    if (readOnly || busy || !g) return;
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
      await insertPlannedExercises(head.data.id, replanRows(g.entries));
      await queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] });
      setCopying(null);
      toast.success(t("log.plannedUnderWorkouts", { date: form.date }));
      void navigate({ to: "/workout" });
    } catch {
      toast.error(t("log.couldNotPlanTheWorkout"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (readOnly || !deleting || busy) return;
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
      toast.success(t("log.workoutRemovedFromTheLog"));
    } catch {
      toast.error(t("log.couldNotRemoveTheWorkout"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-5 px-4">
      {!log.length && <p className="text-muted-foreground">{t("log.noWorkoutsYet")}</p>}
      <Drawer
        open={!!copying}
        onOpenChange={(o) => {
          if (!o && !busy) setCopying(null);
        }}
      >
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg space-y-3 px-4 pb-6">
            <DrawerHeader className="px-0">
              <DrawerTitle className="font-display text-2xl">{t("log.planAgain")}</DrawerTitle>
              <DrawerDescription>
                {t("log.copiedAsAPlannedWorkout")}
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-1">
              <Label htmlFor="copy-title">{t("common.name")}</Label>
              <Input
                id="copy-title"
                className="h-12"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="log-date">{t("common.date")}</Label>
                <LogDatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="copy-gym">{t("common.location")}</Label>
                <select
                  id="copy-gym"
                  className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.gymId}
                  onChange={(e) => setForm({ ...form, gymId: e.target.value })}
                >
                  <option value="">{t("common.noLocation")}</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>{t("common.runAsCircuit")}</span>
              <Switch checked={form.circuit} onCheckedChange={(circuit) => setForm({ ...form, circuit })} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={readOnly || busy} onClick={() => setCopying(null)}>
                {t("common.cancel")}
              </Button>
              <Button disabled={readOnly || busy || !form.title.trim() || !form.date} onClick={() => void replan()}>
                {t("log.plan")}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      {!!log.length && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {groups.length} {t("log.workouts")} · {log.reduce((n, x) => n + (x.sets ?? 1), 0)} {t("common.sets")}{(() => { const kg = tonnageSummary(log).kg; return kg ? ` · ${formatTonnage(kg, language)}` : ""; })()}
          </span>
          <span className="flex gap-1">
            <Button variant="ghost" size="icon" disabled={!log.length} aria-label={t("log.exportExcel")} title={t("log.exportExcel")} onClick={() => { try { const rep = buildLogReport(log, exercises, gyms, t("log.report.weekdays").split(","), new Map(log.flatMap((x) => (x.workout_id && x.workout?.title ? [[x.workout_id, x.workout.title] as const] : []))));
                  const sheet = (k: keyof typeof REPORT_COLUMNS) => ({ name: t(`log.report.sheet.${k}`), header: REPORT_COLUMNS[k].map((c) => t(`log.report.col.${c}`)), rows: rep[k] });
                  downloadLogXlsx([{ name: t("log.report.sheet.raw"), header: LOG_EXPORT_COLUMNS.map((c) => t(`log.col.${c}`)), rows: logExportRows(log, exercises, gyms) }, sheet("workouts"), sheet("weeks"), sheet("weekdayRows"), sheet("perExercise"), sheet("categories"), sheet("places")], todayISO()); } catch { toast.error(t("log.exportFailed")); } }}><FileSpreadsheet className="size-4" /></Button>
            {[false, true].map((c) => (
              <Button
                key={String(c)}
                variant="ghost"
                size="icon"
                aria-pressed={compact === c}
                aria-label={c ? t("log.compactList") : t("log.cards")}
                title={c ? t("log.compactList") : t("log.cards")}
                className={compact === c ? "bg-muted text-foreground" : ""}
                onClick={() => chooseView(c)}
              >
                {c ? <Rows3 className="size-4" /> : <LayoutList className="size-4" />}
              </Button>
            ))}
          </span>
        </div>
      )}
      <div className={compact ? "divide-y rounded-xl border bg-card" : "space-y-4"}>
        {groups.map((g) => {
          const entries = workoutRecordingOrder(g.entries);
          const headers = logSectionHeaders(entries, g.entries[0]?.workout?.is_circuit ?? false);
          const sectionHeader = (i: number) => {
            const h = headers[i];
            if (!h || (!h.phase && !h.lap)) return null;
            return <p className="border-y bg-muted px-3 py-1 text-xs font-semibold">{[h.phase ? t(`phase.${h.phase}`) : null, h.lap ? t("circuitRunner.lapNumber", { lap: h.lap }) : null].filter(Boolean).join(" · ")}</p>;
          };
          const cats = [
            ...new Set(
              entries.map((e) => exercises.find((ex) => ex.code === e.code)?.category).filter((c): c is string => !!c),
            ),
          ];
          const open = isOpen(g);
          const places = [
            ...new Set(
              entries.map((x) => gyms.find((gym) => gym.id === x.gym_id)?.name ?? t("common.noLocation")),
            ),
          ];
          const sets = entries.reduce((n, x) => n + (x.sets ?? 1), 0);
          const ton = tonnageSummary(entries);
          const tonText = [ton.kg ? formatTonnage(ton.kg, language) : null, ton.minutes ? `${ton.minutes} min` : null, ton.kgPerMin ? `${ton.kgPerMin} ${t("log.tonnagePerMin")}` : null].filter(Boolean).map((x) => ` · ${x}`).join("");
          if (compact)
            return (
              <section key={g.key}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOverrides((m) => new Map(m).set(g.key, !open))}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{g.date}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {titleOf(g)}
                    {g.entries[0]?.workout?.created_by === "ai" && (
                      <Sparkles className="ml-1 inline size-3 text-primary" aria-label="AI" />
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {cats.map((cat) => (
                      <span
                        key={cat}
                        title={cat}
                        data-category={categoryToken(cat, categories)}
                        className="category-theme size-2.5 rounded-full bg-category-fill"
                      />
                    ))}
                  </span>
                </button>
                {open && (
                  <div className="border-t bg-muted/20 text-sm">
                    {entries.map((e, i) => (
                      <Fragment key={e.id}>{sectionHeader(i)}
                      <button
                        type="button"
                        key={e.id}
                        onClick={() => setEntry(e)}
                        data-category={categoryToken(exercises.find((ex) => ex.code === e.code)?.category ?? "", categories)}
                        className="category-theme flex w-full items-center gap-3 border-l-4 border-category-fill px-3 py-1.5 text-left"
                      >
                        <span className="w-12 shrink-0 font-semibold text-category-ink">{e.recorded_code ?? e.code}</span>
                        <span className="min-w-0 flex-1 truncate">{loggedName(e, rawByCode.get(e.code), byCode.get(e.code)) || t("log.unknownExercise")}<RatingMark rating={e.exercise_rating} /></span>
                        <span className="font-semibold">{formatSet(e, e.reps_unit === "reps" ? "" : t(`repsUnit.${e.reps_unit as RepsUnit}`).toLowerCase())}</span>
                      </button></Fragment>
                    ))}
                    <div className="flex items-center justify-end gap-1 px-2 py-1 text-xs text-muted-foreground">
                      <span className="mr-auto">{sets} {t("common.sets")}{tonText} · {places.join(", ")}</span>
                      {g.workoutId && <Button variant="ghost" size="icon" disabled={readOnly || busy} title={t("log.rename")} aria-label={`${t("log.rename")}: ${titleOf(g)}`} onClick={() => setRenaming({ id: g.workoutId!, title: titleOf(g) })}>
                        <Pencil className="size-4" />
                      </Button>}
                      <Button variant="ghost" size="icon" disabled={readOnly || busy} title={t("log.planAgain")} aria-label={`${t("log.planAgain")}: ${titleOf(g)}`} onClick={() => openCopy(g)}>
                        <Repeat className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={readOnly || busy} className="text-destructive" title={t("log.removeWorkout")} aria-label={`${t("log.removeWorkout")}: ${titleOf(g)}`} onClick={() => setDeleting(g)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            );
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
                      {formatDateWithWeekday(g.date, language)} · {sets} {t("common.sets")}{tonText} · {places.join(", ")}
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
                {g.workoutId && <Button variant="ghost" size="icon" disabled={readOnly || busy} title={t("log.rename")} aria-label={`${t("log.rename")}: ${titleOf(g)}`} onClick={() => setRenaming({ id: g.workoutId!, title: titleOf(g) })}>
                  <Pencil className="size-4" />
                </Button>}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={readOnly || busy}
                  title={t("log.planAgain")}
                  aria-label={`${t("log.planAgain")}: ${titleOf(g)}`}
                  onClick={() => openCopy(g)}
                >
                  <Repeat className="size-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={readOnly || busy}
                  className="text-destructive"
                  title={t("log.removeWorkout")}
                  aria-label={`${t("log.removeWorkout")}: ${titleOf(g)}`}
                  onClick={() => setDeleting(g)}
                >
                  <Trash2 className="size-5" />
                </Button>
              </div>
              <div id={`workout-${g.key}`} hidden={!open} className="divide-y border-t">
                {entries.map((e, i) => (
                  <Fragment key={e.id}>{sectionHeader(i)}
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
                    <span className="w-12 shrink-0 font-bold text-category-ink">{e.recorded_code ?? e.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {loggedName(e, rawByCode.get(e.code), byCode.get(e.code)) || t("log.unknownExercise")}
                        <RatingMark rating={e.exercise_rating} />
                      </span>
                      {(e.note || e.effort) && <span className="block truncate text-xs text-muted-foreground">{e.effort ? `${t("effort.label")} ${e.effort} · ${t(`effort.l${e.effort}` as "effort.l1")}` : ""}{e.effort && e.note ? " · " : ""}{e.note}</span>}
                    </span>
                    <span className="text-lg font-bold">{formatSet(e, e.reps_unit === "reps" ? "" : t(`repsUnit.${e.reps_unit as RepsUnit}`).toLowerCase())}</span>
                  </Button></Fragment>
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
            <AlertDialogTitle>{t("log.removeTheWorkoutFromThe")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                t("log.loggedRowsWillBePermanently", { v0: titleOf(deleting), date: deleting.date, length: deleting.entries.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={readOnly || busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={readOnly || busy}
              onClick={(ev) => {
                ev.preventDefault();
                void remove();
              }}
            >
              {busy ? t("common.removing") : t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Drawer open={!!renaming} onOpenChange={(o) => { if (!o && !busy) setRenaming(null); }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md space-y-3 px-4 pb-8">
            <DrawerHeader className="px-0"><DrawerTitle className="font-display text-2xl">{t("log.renameWorkout")}</DrawerTitle><DrawerDescription className="sr-only">{t("log.rename")}</DrawerDescription></DrawerHeader>
            <Input autoFocus value={renaming?.title ?? ""} onChange={(e) => setRenaming((r) => r && { ...r, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void saveRename(); }} />
            <Button className="w-full" disabled={readOnly || busy || !renaming?.title.trim()} onClick={() => void saveRename()}>{t("common.save")}</Button>
          </div>
        </DrawerContent>
      </Drawer>
      <LogSheet
        exercise={entry ? (byCode.get(entry.code) ?? null) : null}
        entry={entry}
        onClose={() => setEntry(null)}
      />
    </main>
  );
}

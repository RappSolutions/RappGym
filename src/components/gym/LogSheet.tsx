import { useUserView } from "@/lib/user-view";
import { EffortRuler } from "@/components/gym/EffortRuler";
import { DEFAULT_EFFORT, isEffort, type Effort } from "@/lib/effort";
import { AdminExerciseEdit } from "@/components/gym/AdminExerciseEdit";
import { repsUnit } from "@/lib/reps-unit";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { gymsQuery, todayISO, useInvalidateGym, formatSet, type Exercise, type LogEntry, type PlannedRow } from "@/lib/gym";
import { ExerciseImages } from "./ExerciseImages";
import { RatingPicker } from "./RatingPicker";
import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { LogDatePicker } from "./LogDatePicker";
import { removePlannedRow, updatePlannedRow } from "@/lib/workout-edit";
import { appendLoadAdvice, splitSuggestedLoad } from "@/lib/suggested-load";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" className="h-12 w-12 text-xl" onClick={() => onChange(Math.max(0, value - 1))}>−</Button>
        <Input inputMode="numeric" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-12 text-center text-lg font-semibold" />
        <Button type="button" variant="secondary" className="h-12 w-12 text-xl" onClick={() => onChange(value + 1)}>+</Button>
      </div>
    </div>
  );
}

export function LogSheet({
  exercise,
  last,
  entry,
  gymId,
  onClose,
  onCompleted,
  progress,
}: {
  exercise: Exercise | null;
  last?: LogEntry | undefined;
  entry?: LogEntry | PlannedRow | null;
  gymId?: string | null;
  onClose: () => void;
  onCompleted?: (() => void) | undefined;
  progress?: string | undefined;
}) {
  const { t, language, localize } = useLanguage();
  const { readOnly } = useUserView();
  const invalidate = useInvalidateGym();
  const [round, setRound] = useState(1);
  const [load, setLoad] = useState("");
  const [reps, setReps] = useState(10);
  const [note, setNote] = useState("");
  const [effort, setEffort] = useState<Effort>(DEFAULT_EFFORT);
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const { data: gyms = [] } = useQuery(gymsQuery);
  const [place, setPlace] = useState<string>("");
  const shown = exercise ? localize(exercise) : null;

  useEffect(() => {
    if (!exercise) return;
    const src = entry ?? last;
    setRound(entry?.sets ?? 1);
    const split = entry?.status === "suggested" ? splitSuggestedLoad(src?.load ?? "") : { load: src?.load ?? "", advice: "" };
    setLoad(split.load);
    setReps(src?.reps ?? 10);
    setNote(appendLoadAdvice(entry?.note ?? "", split.advice));
    setDate(entry?.date ?? todayISO());
    setEffort(entry?.status === "completed" && "effort" in entry && isEffort(entry.effort) ? entry.effort : DEFAULT_EFFORT);
    setPlace((entry ? entry.gym_id : gymId) ?? "");
  }, [exercise, entry, last, gymId]);

  async function save(complete = true) {
    if (!exercise || readOnly) return;
    setBusy(true);
    const plan = entry?.status === "suggested" ? (entry as PlannedRow) : null;
    const row = { code: exercise.code, sets: entry?.status === "suggested" ? Math.max(1, round) : entry?.status === "completed" ? entry.sets ?? 1 : 1, load, reps, note: note || null, date, gym_id: place || null };
    let error: { message: string } | null = null;
    const fact = { ...row, effort };
    if (plan && !complete) error = await updatePlannedRow(plan.id, row).then(() => null, (e: Error) => e);
    // Completing a plan records a new fact; the plan itself stays for plan-vs-actual.
    else if (plan) error = (await supabase.from("log_entries").insert({ ...fact, workout_id: plan.workout_id, phase: plan.phase })).error;
    else error = (entry ? await supabase.from("log_entries").update(fact).eq("id", entry.id) : await supabase.from("log_entries").insert(fact)).error;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const code = exercise.code;
    toast.success(`${code} ${t("logSheet.saved")}${row.sets > 1 ? ` (${row.sets} ${t("common.sets")})` : ""}`, entry ? undefined : {
      duration: 8000,
      action: {
        label: t("logSheet.1IdenticalSet"),
        onClick: async () => {
          const { error: e2 } = await supabase.from("log_entries").insert({ ...fact, sets: 1 });
          if (e2) toast.error(e2.message);
          else { toast.success(`${code}: ${t("logSheet.oneMoreSet")}`); invalidate(); }
        },
      },
    });
    invalidate();
    if (entry?.status === "suggested" && complete && onCompleted) onCompleted();
    else onClose();
  }

  async function remove() {
    if (!entry || readOnly) return;
    if (!await confirmDialog(t("logSheet.deleteThisLogEntry"))) return;
    const { error } = entry.status === "suggested"
      ? await removePlannedRow(entry.id).then(() => ({ error: null }), (e: Error) => ({ error: e }))
      : await supabase.from("log_entries").delete().eq("id", entry.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    onClose();
  }

  return (
    <Drawer open={!!exercise} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <div className="mx-auto max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0">
            {entry?.status === "suggested" && <p className="font-semibold text-primary">{t("logSheet.suggestion")}{progress ? ` · ${progress}` : ""}</p>}
            <DrawerTitle className="font-display text-2xl uppercase">
              <span className="text-primary">{shown?.code}</span> {shown?.name}<AdminExerciseEdit exercise={exercise} />{exercise && <Link to="/exercises/$code" params={{ code: exercise.code }} onClick={onClose} aria-label={t("logSheet.openExercise")} title={t("logSheet.openExercise")} className="ml-1 inline-flex size-8 items-center justify-center align-middle text-muted-foreground"><Info className="size-4" /></Link>}{exercise && <RatingPicker exerciseId={exercise.id} className="ml-1" />}
            </DrawerTitle>
            <DrawerDescription>
              {last && !entry && `${t("logSheet.last")}: ${formatSet({ ...last, sets: 1 })}`}
            </DrawerDescription>
          </DrawerHeader>
          {shown && <ExerciseImages exercise={shown} />}
          <fieldset disabled={readOnly} className="space-y-4">
          <div className={entry?.status === "suggested" ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}>
            {entry?.status === "suggested" && <Stepper label={t("logSheet.numberOfSets")} value={round} onChange={setRound} />}
            <Stepper label={t(`repsUnit.${repsUnit(exercise)}`)} value={reps} onChange={setReps} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="log-load">{t("logSheet.loadKgBand")}</Label>
              <Input id="log-load" value={load} onChange={(e) => setLoad(e.target.value)} className="h-12 text-lg font-semibold" placeholder={t("logSheet.eG25OrOrange")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-date">{t("common.date")}</Label>
              <LogDatePicker value={date} onChange={setDate} />
            </div>
          </div>
          {gyms.length > 0 && <div className="space-y-2">
            <Label htmlFor="log-place">{t("common.location")}</Label>
            <select id="log-place" value={place} onChange={(e) => setPlace(e.target.value)} className="h-12 w-full rounded-md border border-input bg-background px-3">
              <option value="">{t("common.noLocation")}</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>}
          <div className="space-y-2">
            <Label htmlFor="log-note">{t("logSheet.notesFeel")}</Label>
            <Textarea id="log-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <EffortRuler value={effort} onChange={setEffort} disabled={readOnly || busy} />
          <Button onClick={() => void save()} disabled={readOnly || busy} className="h-14 w-full text-lg font-bold uppercase">
            {entry?.status === "suggested" ? t("logSheet.confirmCompleted") : entry ? t("logSheet.saveChanges") : t("common.logSets")} – {t(`effort.l${effort}`)}
          </Button>
          {entry?.status === "suggested" && <Button variant="outline" disabled={readOnly || busy} className="w-full" onClick={() => void save(false)}>{t("logSheet.saveAdjustedSuggestion")}</Button>}
          {entry && (
            <Button variant="ghost" disabled={readOnly || busy} onClick={remove} className="w-full text-destructive">{t("common.delete")}</Button>
          )}
          </fieldset>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

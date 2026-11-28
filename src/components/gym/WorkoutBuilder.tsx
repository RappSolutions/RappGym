import { useUserView } from "@/lib/user-view";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, ListPlus, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, todayISO, type Exercise, type LogEntry } from "@/lib/gym";
import { useStartWorkout } from "@/components/gym/ActiveWorkout";
import { insertPlannedExercises } from "@/lib/workout-edit";
import { ExerciseGroupingSelect } from "@/components/gym/ExerciseGroupingSelect";
import { groupExerciseChoices, type ExerciseGrouping } from "@/lib/exercise-selection";

/** Builder for an own workout, stored like AI plans (suggested rows); can be planned for later or started right away. */
export function WorkoutBuilder({
  exercises,
  last,
  gymId,
  quickStart = false,
}: {
  exercises: Exercise[];
  last: Map<string, LogEntry>;
  gymId: string;
  quickStart?: boolean;
}) {
  const { t, localize, language } = useLanguage();
  const [groupBy, setGroupBy] = useState<ExerciseGrouping>("category");
  const { readOnly } = useUserView();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [laps, setLaps] = useState(3);
  const [reps, setReps] = useState(12);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const startWorkout = useStartWorkout();
  const cats = categoriesOf(exercises);
  const groups = groupExerciseChoices(exercises, groupBy, (ex, by) => by === "category" ? localize(ex).category : localize(ex).equipment || t("common.noEquipment"), language);

  async function save(start: boolean) {
    if (readOnly || !picked.length || busy) return;
    setBusy(true);
    const workoutId = crypto.randomUUID();
    const head = await supabase
      .from("workouts")
      .insert({
        id: workoutId,
        title: title.trim() || t("workoutBuilder.ownWorkout"),
        created_by: "user",
        scheduled_date: todayISO(),
        gym_id: gymId,
        is_circuit: true,
      });
    if (head.error) {
      setBusy(false);
      toast.error(t("workoutBuilder.couldNotSaveTheWorkout"));
      return;
    }
    const error = await insertPlannedExercises(workoutId, picked.map((code) => ({ code, sets: Math.max(1, laps), reps, load: last.get(code)?.load ?? "" }))).then(() => null, (e: unknown) => e);
    setBusy(false);
    if (error) {
      toast.error(t("workoutBuilder.couldNotSaveTheWorkout"));
      return;
    }
    await qc.invalidateQueries({ queryKey: ["workout-suggestions"] });
    setOpen(false);
    setPicked([]);
    setTitle("");
    if (start) startWorkout(workoutId);
    else toast.success(t("workoutBuilder.workoutPlanned"));
  }

  return (
    <>
      <Button
        variant={quickStart ? "secondary" : "outline"}
        size={quickStart ? "lg" : "default"}
        className="w-full px-4"
        disabled={readOnly}
        onClick={() => setOpen(true)}
      >
        {quickStart ? <Play className="size-4" /> : <ListPlus className="size-4" />}
        {quickStart ? t("workoutBuilder.createWorkout") : t("workoutBuilder.createWorkout")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {quickStart ? t("workoutBuilder.createWorkout") : t("workoutBuilder.createWorkout")}
            </DialogTitle>
            <DialogDescription>
              {t("workoutBuilder.pickExercisesInTheOrder")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("workoutBuilder.nameOptional")}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">
              {t("common.sets2")}
              <Input type="number" min={1} value={laps} onChange={(e) => setLaps(Number(e.target.value) || 1)} />
            </label>
            <label className="text-sm">
              {t("common.reps")}
              <Input type="number" min={1} value={reps} onChange={(e) => setReps(Number(e.target.value) || 1)} />
            </label>
          </div>
          {picked.length > 0 && (
            <p className="text-sm">
              <span className="font-semibold">{t("workoutBuilder.order")}</span> {picked.join(" → ")}
            </p>
          )}
          <div className="space-y-2">
            <ExerciseGroupingSelect value={groupBy} onChange={setGroupBy} />
            {groups.map((group) => {
              const list = group.exercises;
              const count = list.filter((e) => picked.includes(e.code)).length;
              const isOpen = openCats.has(group.id);
              return (
                <div
                  key={group.id}
                  data-category={groupBy === "category" ? categoryToken(list[0]?.category ?? "", cats) : undefined}
                  className={`overflow-hidden rounded-lg border ${groupBy === "category" ? "category-theme border-l-4 border-l-category-fill" : ""}`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    aria-expanded={isOpen}
                    className={`flex min-h-11 h-auto w-full justify-start gap-2 px-3 text-left font-bold ${groupBy === "category" ? "text-category-ink" : ""}`}
                    onClick={() =>
                      setOpenCats((s) => {
                        const n = new Set(s);
                        if (n.has(group.id)) n.delete(group.id);
                        else n.add(group.id);
                        return n;
                      })
                    }
                  >
                    {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="min-w-0 flex-1 whitespace-normal">{group.label}</span>
                    {count > 0 && (
                      <span className="text-sm text-primary">
                        {count} {t("workoutBuilder.picked")}
                      </span>
                    )}
                    <span className="text-xs font-normal text-muted-foreground">{list.length}</span>
                  </Button>
                  {isOpen && (
                    <div className="divide-y border-t">
                      {list.map((ex) => {
                        const l = localize(ex);
                        const n = picked.indexOf(ex.code);
                        return (
                          <label key={ex.id} data-category={categoryToken(ex.category, cats)} className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 ${groupBy === "equipment" ? "category-theme border-l-4 border-l-category-fill" : ""}`}>
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={n >= 0}
                              onChange={() =>
                                setPicked((p) => (n >= 0 ? p.filter((c) => c !== ex.code) : [...p, ex.code]))
                              }
                            />
                            <span className="w-10 font-bold">{l.code}</span>
                            <span className="flex-1 truncate">{l.name}</span>
                            {n >= 0 && <span className="text-sm font-bold text-primary">#{n + 1}</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={!picked.length || busy} onClick={() => void save(true)}>
              <Play className="size-4" />
              {t("workoutBuilder.startNow", { length: picked.length })}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={!picked.length || busy}
              onClick={() => void save(false)}
            >
              {t("workoutBuilder.saveAsPlanned")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

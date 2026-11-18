import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronDown, ChevronRight, Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { ExerciseDetails } from "@/components/gym/ExerciseDetails";
import { ExerciseForm } from "@/components/gym/ExerciseForm";
import { LogSheet } from "@/components/gym/LogSheet";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, categoryToken, exercisesQuery, logQuery, useInvalidateGym, type Exercise, type LogEntry } from "@/lib/gym";

export function ExerciseManager() {
  const { t, localize } = useLanguage();
  const { data: sourceExercises } = useSuspenseQuery(exercisesQuery);
  const [showInactive, setShowInactive] = useState(false);
  const inactiveCount = sourceExercises.filter((e) => !e.is_active).length;
  const exercises = sourceExercises.filter((e) => showInactive || e.is_active).map(localize);
  const { data: log } = useSuspenseQuery(logQuery);
  const invalidate = useInvalidateGym();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [logging, setLogging] = useState<{ exercise: Exercise; entry: LogEntry | null } | null>(null);
  const cats = categoriesOf(exercises);
  // Any log row (completed or planned) blocks deletion via FK RESTRICT, so decide on the same data.
  const { data: usedIds = [] } = useQuery({ queryKey: ["log", "used-exercise-ids"], queryFn: async () => {
    const ids: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("log_entries").select("exercise_id").not("exercise_id", "is", null).range(from, from + 999);
      if (error) throw error;
      ids.push(...data.map((r) => r.exercise_id as string));
      if (data.length < 1000) break;
    }
    return ids;
  } });
  const used = useMemo(() => new Set(usedIds), [usedIds]);
  const countOf = (cat: string) => { const all = sourceExercises.map(localize).filter((e) => e.category === cat); const active = all.filter((e) => e.is_active).length; return active === all.length ? `${active}` : `${active}/${all.length - active}`; };
  const s = q.toLowerCase();
  const hits = exercises.filter((e) =>
    [e.code, e.name, e.equipment, e.category].some((v) => v.toLowerCase().includes(s)),
  );

  const live = (ex: Exercise) => sourceExercises.find((e) => e.id === ex.id) ?? ex;

  async function remove(ex: Exercise) {
    const { count, error: countError } = await supabase.from("log_entries").select("id", { count: "exact", head: true }).eq("exercise_id", ex.id);
    if (countError) { toast.error(countError.message); return; }
    if (count) {
      if (!await confirmDialog(t(`${ex.code} ${ex.name} används i ${count} loggrader (genomförda eller föreslagna) . Inaktivera den? Den döljs i Träna och AI-planering, all historik behålls och du kan återaktivera den med ögat.`, `${ex.code} ${ex.name} is used in ${count} log rows (completed or suggested), . Deactivate it? It is hidden in Train and AI planning, all history is kept and you can reactivate it with the eye.`))) return;
      const { error } = await supabase.from("exercises").update({ is_active: false }).eq("id", ex.id);
      if (error) { toast.error(error.message); return; }
      toast.success(t("Övningen är dold", "Exercise hidden"));
      if (openId === ex.id) setOpenId(null);
      invalidate();
      return;
    }
    if (!await confirmDialog(t(`Radera ${ex.code} ${ex.name} permanent? Den har aldrig använts i loggen.`, `Permanently delete ${ex.code} ${ex.name}? It has never been used in the log.`))) return;
    const { error } = await supabase.from("exercises").delete().eq("id", ex.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (openId === ex.id) setOpenId(null);
    invalidate();
    void qc.invalidateQueries({ queryKey: ["log", "used-exercise-ids"] });
  }

  async function reactivate(ex: Exercise) {
    const { error } = await supabase.from("exercises").update({ is_active: true }).eq("id", ex.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("Övningen är aktiv igen", "Exercise reactivated"));
    invalidate();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />{t(`Visa inaktiva (${inactiveCount})`, `Show inactive (${inactiveCount})`)}</label>
        <Button onClick={() => setAdding(true)} className="font-semibold"><Plus className="h-4 w-4" />{t("Ny", "New")}</Button>
      </div>
      <div className="relative">
        <Search className="absolute top-3.5 left-3 h-5 w-5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Sök namn, kod, redskap, muskel…", "Search name, code, equipment, muscle…")} className="h-12 pl-10" />
      </div>
      {cats.map((c) => {
        const list = hits.filter((e) => e.category === c);
        if (!list.length) return null;
        return (
          <section key={c} data-category={categoryToken(c, cats)} className="category-theme space-y-2">
            <Button variant="ghost" aria-expanded={expanded.has(c)} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(c)) next.delete(c); else next.add(c); return next; })} className="h-14 w-full justify-start border-l-4 border-category-fill bg-category-fill/10 px-3 font-display text-xl font-bold uppercase text-category-ink hover:bg-category-fill/20 hover:text-category-ink">
              {expanded.has(c) ? <ChevronDown /> : <ChevronRight />}<span className="size-4 shrink-0 rounded-full bg-category-fill" aria-hidden />{c} <span className="text-muted-foreground">({countOf(c)})</span>
            </Button>
            {(expanded.has(c) || !!q.trim()) && <div className="ml-2 space-y-2 border-l-2 border-category-fill/40 pl-3">{list.map((ex) => (
              <div key={ex.id} className="space-y-2">
                <ExerciseCard ex={ex} hideLast token={categoryToken(c, cats)}
                  action={<div className="flex shrink-0 items-center gap-1 pr-2">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(live(ex))} aria-label={t("Redigera", "Edit")} title={t("Redigera", "Edit")}><Pencil className="h-4 w-4" /></Button>
                    {!ex.is_active
                      ? <Button size="icon" variant="ghost" onClick={() => void reactivate(live(ex))} aria-label={t("Återaktivera", "Reactivate")} title={t("Inaktiv – återaktivera", "Inactive – reactivate")}><Eye className="h-4 w-4" /></Button>
                      : used.has(ex.id)
                        ? <Button size="icon" variant="ghost" onClick={() => void remove(live(ex))} aria-label={t("Inaktivera", "Deactivate")} title={t("Används i Logg/Pass – inaktivera istället", "Used in Log/Workouts – deactivate instead")}><EyeOff className="h-4 w-4" /></Button>
                        : <Button size="icon" variant="ghost" onClick={() => void remove(live(ex))} aria-label={t("Ta bort", "Delete")} title={t("Ta bort", "Delete")}><Trash2 className="h-4 w-4" /></Button>}
                  </div>}
                  expanded={openId === ex.id}
                  onClick={() => setOpenId(openId === ex.id ? null : ex.id)}>
                  <ExerciseDetails
                    exercise={live(ex)}
                    log={log}
                    onLog={(entry) => setLogging({ exercise: live(ex), entry: entry ?? null })}
                  />
                </ExerciseCard>
              </div>
            ))}</div>}
          </section>
        );
      })}
      <ExerciseForm open={adding} all={sourceExercises} onClose={(saved) => {
        setAdding(false);
        if (saved) {
          setOpenId(saved.id);
          setExpanded((current) => new Set(current).add(saved.category));
        }
      }} />
      <ExerciseForm open={!!editing} exercise={editing} all={sourceExercises} onClose={() => setEditing(null)} />
      <LogSheet
        exercise={logging ? logging.exercise : null}
        entry={logging?.entry ?? null}
        last={logging ? log.find((e) => e.code === logging.exercise.code) : undefined}
        onClose={() => setLogging(null)}
      />
    </section>
  );
}

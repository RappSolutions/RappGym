import { useLanguage } from "@/lib/i18n";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseCard } from "@/components/gym/ExerciseCard";
import { ExerciseDetails } from "@/components/gym/ExerciseDetails";
import { ExerciseForm } from "@/components/gym/ExerciseForm";
import { LogSheet } from "@/components/gym/LogSheet";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, categoryToken, exercisesQuery, lastByCode, logQuery, useInvalidateGym, type Exercise, type LogEntry } from "@/lib/gym";

export function ExerciseManager() {
  const { t, localize } = useLanguage();
  const { data: sourceExercises } = useSuspenseQuery(exercisesQuery);
  const exercises = sourceExercises.map(localize);
  const { data: log } = useSuspenseQuery(logQuery);
  const invalidate = useInvalidateGym();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [logging, setLogging] = useState<{ exercise: Exercise; entry: LogEntry | null } | null>(null);
  const cats = categoriesOf(exercises);
  const last = useMemo(() => lastByCode(log), [log]);
  const s = q.toLowerCase();
  const hits = exercises.filter((e) =>
    [e.code, e.name, e.equipment, e.muscles, e.category].some((v) => v.toLowerCase().includes(s)),
  );

  const live = (ex: Exercise) => sourceExercises.find((e) => e.id === ex.id) ?? ex;

  async function remove(ex: Exercise) {
    if (!confirm(`${t("Ta bort", "Delete")} ${ex.code} ${ex.name}? ${t("Loggade set behålls.", "Logged sets are kept.")}`)) return;
    const { error } = await supabaseDelete(ex.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (openId === ex.id) setOpenId(null);
    invalidate();
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-display text-2xl font-bold uppercase">{t("Övningar", "Exercises")}</h2>
      <div className="flex justify-end">
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
              {expanded.has(c) ? <ChevronDown /> : <ChevronRight />}{c} <span className="text-muted-foreground">({list.length})</span>
            </Button>
            {(expanded.has(c) || !!q.trim()) && list.map((ex) => (
              <div key={ex.id} className="space-y-2">
                <ExerciseCard ex={ex} last={last.get(ex.code)} token={categoryToken(c, cats)}
                  onClick={() => setOpenId(openId === ex.id ? null : ex.id)} />
                {openId === ex.id && (
                  <ExerciseDetails
                    exercise={live(ex)}
                    log={log}
                    onLog={(entry) => setLogging({ exercise: live(ex), entry: entry ?? null })}
                    onEdit={() => setEditing(live(ex))}
                    onDelete={() => void remove(live(ex))}
                  />
                )}
              </div>
            ))}
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

async function supabaseDelete(id: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase.from("exercises").delete().eq("id", id);
}

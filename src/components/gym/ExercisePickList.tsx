import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, type Exercise } from "@/lib/gym";
import { newExercisePhase, type Phase } from "@/lib/circuit";
import { PhaseSelect } from "@/components/gym/PhaseSelect";
import { ExerciseImages } from "@/components/gym/ExerciseImages";
import { InstructionText } from "@/components/gym/InstructionText";
import { AdminExerciseEdit } from "@/components/gym/AdminExerciseEdit";

/** Inline, category-collapsed exercise browser: clicking a row shows details, only "+" adds it to the chosen phase. */
export function ExercisePickList({ exercises, onPick, disabled, spontaneous = false, title }: { exercises: Exercise[]; onPick: (ex: Exercise, phase: Phase) => void; disabled?: boolean; spontaneous?: boolean; title?: string }) {
  const { localize, t } = useLanguage();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("main");
  const cats = categoriesOf(exercises);
  return (
    <div className="ml-3 space-y-1 rounded-md border border-dashed bg-muted/40 p-2">
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Plus className="size-3.5" /><span className="flex-1">{title ?? t("common.addExercise")}</span>{!spontaneous && <PhaseSelect value={phase} onChange={setPhase} />}</div>
      {cats.map((cat) => {
        const list = exercises.filter((e) => e.category === cat);
        const isOpen = open.has(cat);
        return (
          <div key={cat} data-category={categoryToken(cat, cats)} className="category-theme overflow-hidden rounded-md border bg-background border-l-4 border-l-category-fill">
            <button type="button" aria-expanded={isOpen} className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-category-ink" onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; })}>
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span className="flex-1">{list[0] ? localize(list[0]).category : cat}</span>
              <span className="text-xs font-normal text-muted-foreground">{list.length}</span>
            </button>
            {isOpen && <div className="divide-y border-t">{list.map((ex) => { const l = localize(ex); const isShown = shown === ex.id; return (
              <div key={ex.id}>
                <div className="flex items-center">
                  <button type="button" aria-expanded={isShown} onClick={() => setShown(isShown ? null : ex.id)} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-muted/50">
                    <span className="w-10 font-bold">{l.code}</span><span className="flex-1 truncate">{l.name}</span>
                  </button>
                  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" disabled={disabled} aria-label={`${t("common.add")} ${l.code}`} onClick={() => onPick(ex, newExercisePhase(spontaneous, phase))}><Plus className="size-4" /></Button>
                </div>
                {isShown && <div className="space-y-2 px-3 pb-3 text-sm">
                  <div className="flex items-center gap-2">{l.equipment && <span className="flex-1 text-muted-foreground">{t("common.equipment")}: {l.equipment}</span>}<span className="ml-auto" /><AdminExerciseEdit exercise={ex} /></div>
                  <ExerciseImages exercise={l} />
                  {l.instructions && <InstructionText text={l.instructions} />}
                </div>}
              </div>); })}</div>}
          </div>
        );
      })}
    </div>
  );
}

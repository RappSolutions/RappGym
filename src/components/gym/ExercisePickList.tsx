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
import { ExerciseGroupingSelect } from "@/components/gym/ExerciseGroupingSelect";
import { groupExerciseChoices, type ExerciseGrouping } from "@/lib/exercise-selection";

/** Inline, category-collapsed exercise browser: clicking a row shows details, only "+" adds it to the chosen phase. */
export function ExercisePickList({ exercises, onPick, disabled, spontaneous = false, title }: { exercises: Exercise[]; onPick: (ex: Exercise, phase: Phase) => void; disabled?: boolean; spontaneous?: boolean; title?: string }) {
  const { localize, t, language } = useLanguage();
  const [groupBy, setGroupBy] = useState<ExerciseGrouping>("category");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("main");
  const cats = categoriesOf(exercises);
  const groups = groupExerciseChoices(exercises, groupBy, (ex, by) => by === "category" ? localize(ex).category : localize(ex).equipment || t("common.noEquipment"), language);
  return (
    <div className="ml-3 space-y-1 rounded-md border border-dashed bg-muted/40 p-2">
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Plus className="size-3.5" /><span className="flex-1">{title ?? t("common.addExercise")}</span>{!spontaneous && <PhaseSelect value={phase} onChange={setPhase} />}</div>
      <ExerciseGroupingSelect value={groupBy} onChange={setGroupBy} />
      {groups.map((group) => {
        const list = group.exercises;
        const isOpen = open.has(group.id);
        return (
          <div key={group.id} data-category={groupBy === "category" ? categoryToken(list[0]?.category ?? "", cats) : undefined} className={`overflow-hidden rounded-md border bg-background ${groupBy === "category" ? "category-theme border-l-4 border-l-category-fill" : ""}`}>
            <Button type="button" variant="ghost" aria-expanded={isOpen} className={`flex min-h-10 h-auto w-full justify-start gap-2 px-3 text-left text-sm font-bold ${groupBy === "category" ? "text-category-ink" : ""}`} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(group.id)) n.delete(group.id); else n.add(group.id); return n; })}>
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span className="min-w-0 flex-1 whitespace-normal">{group.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{list.length}</span>
            </Button>
            {isOpen && <div className="divide-y border-t">{list.map((ex) => { const l = localize(ex); const isShown = shown === ex.id; return (
              <div key={ex.id} data-category={categoryToken(ex.category, cats)} className={groupBy === "equipment" ? "category-theme border-l-4 border-l-category-fill" : undefined}>
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

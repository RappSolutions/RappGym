import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, type Exercise } from "@/lib/gym";

/** Inline, category-collapsed exercise list; clicking an exercise adds it. */
export function ExercisePickList({ exercises, onPick, disabled }: { exercises: Exercise[]; onPick: (ex: Exercise) => void; disabled?: boolean }) {
  const { localize } = useLanguage();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const cats = categoriesOf(exercises);
  return (
    <div className="space-y-1">
      {cats.map((cat) => {
        const list = exercises.filter((e) => e.category === cat);
        const isOpen = open.has(cat);
        return (
          <div key={cat} data-category={categoryToken(cat, cats)} className="category-theme overflow-hidden rounded-md border border-l-4 border-l-category-fill">
            <button type="button" aria-expanded={isOpen} className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-category-ink" onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; })}>
              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              <span className="flex-1">{list[0] ? localize(list[0]).category : cat}</span>
              <span className="text-xs font-normal text-muted-foreground">{list.length}</span>
            </button>
            {isOpen && <div className="divide-y border-t">{list.map((ex) => { const l = localize(ex); return (
              <button key={ex.id} type="button" disabled={disabled} onClick={() => onPick(ex)} className="flex min-h-10 w-full items-center gap-3 px-3 py-1.5 text-left text-sm hover:bg-muted/50 disabled:opacity-50">
                <span className="w-10 font-bold">{l.code}</span><span className="flex-1 truncate">{l.name}</span><Plus className="size-4 text-muted-foreground" />
              </button>); })}</div>}
          </div>
        );
      })}
    </div>
  );
}

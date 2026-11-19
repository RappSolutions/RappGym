import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { categoriesOf, categoryToken, type Exercise } from "@/lib/gym";
import { filterExerciseChoices } from "@/lib/exercise-selection";
import { useLanguage } from "@/lib/i18n";

export function ProgressExercisePicker({ exercises, loggedCodes, value, onChange }: { exercises: Exercise[]; loggedCodes: ReadonlySet<string>; value: string; onChange: (code: string) => void }) {
  const { t, localize } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const categories = categoriesOf(exercises);
  const options = exercises.filter((exercise) => loggedCodes.has(exercise.code));
  const localized = options.map((exercise) => ({ ...exercise, name: localize(exercise).name }));
  const matches = filterExerciseChoices(localized, search, category);
  const selected = exercises.find((exercise) => exercise.code === value);
  const missing = [...loggedCodes].filter((code) => !options.some((exercise) => exercise.code === code) && code.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  function choose(code: string) { onChange(code); setOpen(false); }
  return <>
    <Button id="progress-exercise" variant="outline" className="h-auto min-h-11 w-full justify-between whitespace-normal text-left" aria-haspopup="dialog" onClick={() => { setSearch(""); setCategory(null); setOpen(true); }}>
      <span className="min-w-0 break-words">{value === "all" ? t("progressExercisePicker.allExercisesSets") : `${value} · ${selected ? localize(selected).name : t("progressExercisePicker.deletedExercise")}`}</span><ChevronsUpDown className="size-4 shrink-0" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] gap-3 overflow-hidden sm:max-w-xl">
      <DialogHeader><DialogTitle>{t("progressExercisePicker.chooseExercise")}</DialogTitle></DialogHeader>
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label={t("progressExercisePicker.searchExercises")} placeholder={t("progressExercisePicker.searchNameOrCode")} value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("common.category")}>
        <Button size="sm" variant={category === null ? "default" : "outline"} aria-pressed={category === null} onClick={() => setCategory(null)}>{t("progressExercisePicker.all")}</Button>
        {categoriesOf(options).map((cat) => {
          const example = options.find((exercise) => exercise.category === cat);
          return <Button key={cat} size="sm" variant="outline" data-category={categoryToken(cat, categories)} className="category-theme border-l-4 border-category-fill text-category-ink" aria-pressed={category === cat} onClick={() => setCategory(category === cat ? null : cat)}>{category === cat && <Check className="size-3" />}{example ? localize(example).category : cat}</Button>;
        })}
      </div>
      <div className="max-h-[50dvh] overflow-y-auto">
        <Button variant="ghost" className="min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => choose("all")}>{value === "all" && <Check className="size-4 shrink-0" />}{t("progressExercisePicker.allExercisesSets")}</Button>
        {categoriesOf(matches).map((cat) => <div key={cat} className="mt-3" data-category={categoryToken(cat, categories)}>
          <h3 className="category-theme border-b border-category-fill px-2 py-1 text-sm font-bold text-category-ink">{(() => { const example = options.find((exercise) => exercise.category === cat); return example ? localize(example).category : cat; })()}</h3>
          {matches.filter((exercise) => exercise.category === cat).map((exercise) => <Button key={exercise.id} variant="ghost" className="category-theme h-auto min-h-11 w-full justify-start gap-2 whitespace-normal text-left" onClick={() => choose(exercise.code)}><span className="w-10 shrink-0 font-bold text-category-ink">{exercise.code}</span><span className="min-w-0 flex-1 break-words">{exercise.name}</span>{value === exercise.code && <Check className="size-4 shrink-0" />}</Button>)}
        </div>)}
        {category === null && missing.map((code) => <Button key={code} variant="ghost" className="w-full justify-start" onClick={() => choose(code)}>{code} · {t("progressExercisePicker.deletedExercise")}</Button>)}
        {!matches.length && !missing.length && <p className="p-3 text-sm text-muted-foreground">{t("progressExercisePicker.noMatchingExercises")}</p>}
      </div>
    </DialogContent></Dialog>
  </>;
}
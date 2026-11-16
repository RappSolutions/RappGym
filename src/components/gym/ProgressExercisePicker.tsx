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
      <span className="min-w-0 break-words">{value === "all" ? t("Alla övningar – antal set", "All exercises – sets") : `${value} · ${selected ? localize(selected).name : t("Borttagen övning", "Deleted exercise")}`}</span><ChevronsUpDown className="size-4 shrink-0" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85dvh] gap-3 overflow-hidden sm:max-w-xl">
      <DialogHeader><DialogTitle>{t("Välj övning", "Choose exercise")}</DialogTitle></DialogHeader>
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label={t("Sök övning", "Search exercises")} placeholder={t("Sök namn eller kod", "Search name or code")} value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Kategori", "Category")}>
        <Button size="sm" variant={category === null ? "default" : "outline"} aria-pressed={category === null} onClick={() => setCategory(null)}>{t("Alla", "All")}</Button>
        {categoriesOf(options).map((cat) => <Button key={cat} size="sm" variant="outline" data-category={categoryToken(cat, categories)} className="category-theme border-l-4 border-category-fill text-category-ink" aria-pressed={category === cat} onClick={() => setCategory(category === cat ? null : cat)}>{category === cat && <Check className="size-3" />}{localize(options.find((exercise) => exercise.category === cat) ?? options[0] as Exercise).category}</Button>)}
      </div>
      <div className="max-h-[50dvh] overflow-y-auto">
        <Button variant="ghost" className="min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => choose("all")}>{value === "all" && <Check className="size-4 shrink-0" />}{t("Alla övningar – antal set", "All exercises – sets")}</Button>
        {categoriesOf(matches).map((cat) => <div key={cat} className="mt-3" data-category={categoryToken(cat, categories)}>
          <h3 className="category-theme border-b border-category-fill px-2 py-1 text-sm font-bold text-category-ink">{localize(matches.find((exercise) => exercise.category === cat) as Exercise).category}</h3>
          {matches.filter((exercise) => exercise.category === cat).map((exercise) => <Button key={exercise.id} variant="ghost" className="category-theme h-auto min-h-11 w-full justify-start gap-2 whitespace-normal text-left" onClick={() => choose(exercise.code)}><span className="w-10 shrink-0 font-bold text-category-ink">{exercise.code}</span><span className="min-w-0 flex-1 break-words">{exercise.name}</span>{value === exercise.code && <Check className="size-4 shrink-0" />}</Button>)}
        </div>)}
        {category === null && missing.map((code) => <Button key={code} variant="ghost" className="w-full justify-start" onClick={() => choose(code)}>{code} · {t("Borttagen övning", "Deleted exercise")}</Button>)}
        {!matches.length && !missing.length && <p className="p-3 text-sm text-muted-foreground">{t("Inga matchande övningar.", "No matching exercises.")}</p>}
      </div>
    </DialogContent></Dialog>
  </>;
}
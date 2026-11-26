import { useLanguage, localizeExercise } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useExerciseTitle } from "@/hooks/use-exercise-title";
import { exerciseNameUrl, preserveExerciseLink, withExerciseDescription } from "@/lib/exercise-title";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { exercisesQuery, exerciseCategoriesQuery, exerciseEquipmentQuery, useInvalidateGym, type Exercise } from "@/lib/gym";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExerciseImageEditor } from "@/components/gym/ExerciseImageEditor";
import { EXERCISE_SELECT, normalizeExercise, nextCodeNumber } from "@/lib/exercise-refs";
import { REPS_UNITS, repsUnit, type RepsUnit } from "@/lib/reps-unit";

const empty = { code_number: "", category_id: "", equipment_id: "", reps_unit: "reps" as RepsUnit, name: "", instructions: "" };
type Texts = Record<"sv" | "en", { name: string; instructions: string }>;
const selectCls = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const NEW = "__new__";

export function ExerciseForm({
  open,
  exercise,
  all,
  onClose,
}: {
  open: boolean;
  exercise?: Exercise | null;
  all: Exercise[];
  onClose: (saved?: Exercise) => void;
}) {
  const { t, language, refName } = useLanguage();
  const invalidate = useInvalidateGym();
  const [f, setF] = useState(empty);
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery(exerciseCategoriesQuery);
  const { data: equipment = [] } = useQuery(exerciseEquipmentQuery);
  const { data: bank = [] } = useQuery(exercisesQuery);
  const [newCat, setNewCat] = useState<{ name: string; prefix: string; color: string } | null>(null);
  const [newEq, setNewEq] = useState<string | null>(null);
  const [textLanguage, setTextLanguage] = useState<"sv" | "en">(language);
  useEffect(() => {
    if (open) { setTextLanguage(language); setNewCat(null); setNewEq(null); }
  }, [open, language, exercise]);
  // Both languages are drafted side by side, so switching language never drops unsaved edits.
  const [texts, setTexts] = useState<Texts>({ sv: { name: "", instructions: "" }, en: { name: "", instructions: "" } });
  useEffect(() => {
    if (!open) return;
    const pick = (lang: "sv" | "en") => { const l = exercise ? localizeExercise(exercise, lang) : null; return { name: l?.name ?? "", instructions: l?.instructions ?? "" }; };
    const tr = exercise?.translations as Record<string, unknown> | null | undefined;
    const hasSv = !!(tr && typeof tr === "object" && tr["sv"]);
    setTexts({ en: pick("en"), sv: hasSv ? pick("sv") : { name: "", instructions: "" } });
    setF(exercise ? { code_number: String(exercise.code_number), category_id: exercise.category_id ?? "", equipment_id: exercise.equipment_id ?? "", reps_unit: repsUnit(exercise), name: "", instructions: "" } : { ...empty });
  }, [open, exercise]);
  const text = texts[textLanguage];
  const titleLookup = useExerciseTitle(open, `${exercise?.id ?? "new"}:${textLanguage}`);
  function lookupName(value: string) {
    const lang = textLanguage;
    const url = exerciseNameUrl(value);
    if (url) setTexts((cur) => ({ ...cur, [lang]: { ...cur[lang], instructions: preserveExerciseLink(cur[lang].instructions, url) } }));
    void titleLookup.lookup(value, (name, url, description) => setTexts((cur) => cur[lang].name.trim() === value.trim()
      ? { ...cur, [lang]: { name, instructions: withExerciseDescription(preserveExerciseLink(cur[lang].instructions, url), description) } } : cur));
  }
  const prefix = categories.find((c) => c.id === f.category_id)?.code_prefix ?? "";
  // New exercise (or category change): suggest next free number in that category; the user may override it.
  const suggest = (categoryId: string) => String(nextCodeNumber(categoryId, bank, exercise?.id));
  const setText = (k: "name" | "instructions") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setTexts((cur) => ({ ...cur, [textLanguage]: { ...cur[textLanguage], [k]: v } }));
  };
  function pickCategory(id: string) {
    if (id === NEW) { setNewCat({ name: "", prefix: "", color: "#0063ff" }); return; }
    setF((cur) => ({ ...cur, category_id: id, code_number: !exercise || id !== exercise.category_id ? suggest(id) : String(exercise.code_number) }));
  }
  async function addCategory() {
    if (!newCat) return;
    const { data, error } = await supabase.from("exercise_categories").insert({ name: newCat.name.trim(), code_prefix: newCat.prefix.trim().toUpperCase(), color_token: newCat.color.toLowerCase(), sort_order: categories.length + 1 }).select().single();
    if (error) { toast.error(error.code === "23505" ? t("common.nameOrPrefixAlreadyExists") : error.message); return; }
    await qc.invalidateQueries({ queryKey: ["exercise-categories"] });
    setNewCat(null);
    setF((cur) => ({ ...cur, category_id: data.id, code_number: "1" }));
  }
  async function addEquipment() {
    if (!newEq?.trim()) return;
    const { data, error } = await supabase.from("exercise_equipment").insert({ name: newEq.trim() }).select().single();
    if (error) { toast.error(error.code === "23505" ? t("common.equipmentAlreadyExists") : error.message); return; }
    await qc.invalidateQueries({ queryKey: ["exercise-equipment"] });
    setNewEq(null);
    setF((cur) => ({ ...cur, equipment_id: data.id }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (titleLookup.loading || exerciseNameUrl(text.name)) return;
    if (!f.category_id) { toast.error(t("exerciseForm.chooseACategory")); return; }
    // English is the base; Swedish (and future languages) live in translations.
    const base = { name: (texts.en.name || texts.sv.name).trim(), instructions: texts.en.instructions || texts.sv.instructions };
    if (!base.name) { toast.error(t("common.name")); return; }
    const existing = exercise?.translations;
    const translations = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    const sv = texts.sv.name.trim() || texts.sv.instructions.trim() ? { name: texts.sv.name.trim(), instructions: texts.sv.instructions } : null;
    const num = Number(f.code_number);
    if (!Number.isInteger(num) || num < 1) { toast.error(t("exerciseForm.code")); return; }
    const row = { code_number: num, category_id: f.category_id, equipment_id: f.equipment_id || null, reps_unit: f.reps_unit, name: base.name, instructions: base.instructions, translations: sv ? { ...translations, sv } : translations };
    const res = exercise
      ? await supabase.from("exercises").update(row).eq("id", exercise.id).select(EXERCISE_SELECT).single()
      : await supabase.from("exercises").insert({ ...row, code: "", sort_order: all.length }).select(EXERCISE_SELECT).single(); // code is derived by the DB trigger
    if (res.error) {
      toast.error(res.error.code === "23505" ? t("exerciseForm.codeAlreadyExists") : res.error.message);
      return;
    }
    // Log rows follow the exercise by id; the database keeps their code in sync.
    invalidate();
    toast.success(t("exerciseForm.exerciseSaved"));
    onClose(normalizeExercise(res.data));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{exercise ? t("exerciseForm.editExercise") : t("exerciseForm.newExercise")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label>{t("exerciseForm.exerciseTextLanguage")}</Label><select aria-label={t("exerciseForm.exerciseTextLanguage")} value={textLanguage} onChange={(e) => setTextLanguage(e.target.value === "en" ? "en" : "sv")} className="h-10 w-full rounded-md border bg-background px-3"><option value="sv">Svenska</option><option value="en">English</option></select></div>
          <div className="space-y-1"><Label htmlFor="ex-name">{t("exerciseForm.nameOrUrl")}</Label><div className="relative"><Input id="ex-name" className="pr-9" required={textLanguage === "sv" || !texts.sv.name} value={text.name} aria-busy={titleLookup.loading} onChange={(e) => { titleLookup.cancel(); setText("name")(e); }} onPaste={(e) => { const value = e.clipboardData.getData("text").trim(); if (exerciseNameUrl(value)) { e.preventDefault(); setTexts((cur) => ({ ...cur, [textLanguage]: { ...cur[textLanguage], name: value } })); lookupName(value); } }} onBlur={() => { if (!titleLookup.loading) lookupName(text.name); }} />{titleLookup.loading && <LoaderCircle aria-label={t("exerciseForm.fetchingTitle")} className="pointer-events-none absolute right-3 top-3 size-4 animate-spin text-muted-foreground" />}</div></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="ex-cat">{t("common.category")}</Label>
              <select id="ex-cat" required value={newCat ? NEW : f.category_id} onChange={(e) => pickCategory(e.target.value)} className={selectCls}>
                <option value="" disabled>{t("exerciseForm.choose")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{refName(c)} ({c.code_prefix})</option>)}
                <option value={NEW}>{t("exerciseForm.newCategory")}</option>
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="ex-code">{t("exerciseForm.code")}</Label><div className="flex items-center rounded-md border bg-background"><span className="pl-3 font-semibold text-muted-foreground">{prefix || "—"}</span><Input id="ex-code" type="number" min={1} step={1} required inputMode="numeric" className="border-0 pl-1 shadow-none focus-visible:ring-0" value={f.code_number} onChange={(e) => setF({ ...f, code_number: e.target.value })} /></div></div>
          </div>
          {newCat && <div className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2 rounded-md border border-dashed bg-muted/40 p-2">
            <div className="space-y-1"><Label className="text-xs">{t("common.name")}</Label><Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t("exerciseForm.prefix")}</Label><Input value={newCat.prefix} maxLength={4} onChange={(e) => setNewCat({ ...newCat, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t("common.colour")}</Label>
              <input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="h-10 w-full cursor-pointer rounded-md border bg-background p-1" /></div>
            <div className="flex gap-1"><Button type="button" size="sm" variant="secondary" disabled={!newCat.name.trim() || !newCat.prefix} onClick={addCategory}>{t("common.add")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setNewCat(null)}>✕</Button></div>
          </div>}
          <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="ex-eq">{t("common.equipment")}</Label>
            <select id="ex-eq" value={newEq !== null ? NEW : f.equipment_id} onChange={(e) => e.target.value === NEW ? setNewEq("") : setF({ ...f, equipment_id: e.target.value })} className={selectCls}>
              <option value="">{t("exerciseForm.none")}</option>
              {equipment.map((q) => <option key={q.id} value={q.id}>{refName(q)}</option>)}
              <option value={NEW}>{t("exerciseForm.newEquipment")}</option>
            </select>
          </div>
            <div className="space-y-1"><Label htmlFor="ex-unit">{t("exerciseForm.unit")}</Label><select id="ex-unit" value={f.reps_unit} onChange={(e) => setF({ ...f, reps_unit: e.target.value as RepsUnit })} className={selectCls}>{REPS_UNITS.map((u) => <option key={u} value={u}>{t(`repsUnitOption.${u}`)}</option>)}</select></div>
          </div>
          {newEq !== null && <div className="flex items-end gap-2 rounded-md border border-dashed bg-muted/40 p-2">
            <Input value={newEq} onChange={(e) => setNewEq(e.target.value)} placeholder={t("common.name")} />
            <Button type="button" size="sm" variant="secondary" disabled={!newEq.trim()} onClick={addEquipment}>{t("common.add")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setNewEq(null)}>✕</Button>
          </div>}
          <div className="space-y-1"><Label htmlFor="ex-ins">{t("exerciseForm.instructionsTips")}</Label><Textarea id="ex-ins" rows={5} value={text.instructions} onChange={setText("instructions")} /></div>

          {exercise && <ExerciseImageEditor exercise={exercise} />}
          <Button type="submit" disabled={titleLookup.loading || !!exerciseNameUrl(text.name)} className="h-12 w-full font-bold uppercase">{t("common.save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

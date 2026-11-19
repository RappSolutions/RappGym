import { useLanguage, localizeExercise } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { exerciseCategoriesQuery, exerciseEquipmentQuery, useInvalidateGym, type Exercise } from "@/lib/gym";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gymsQuery } from "@/lib/gym";
import { exerciseLocationsQuery } from "@/lib/exercise-locations";
import { ExerciseImageEditor } from "@/components/gym/ExerciseImageEditor";

const empty = { code: "", category_id: "", equipment_id: "", name: "", instructions: "" };
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
  const { t, language } = useLanguage();
  const invalidate = useInvalidateGym();
  const [f, setF] = useState(empty);
  const qc = useQueryClient();
  const { data: gyms = [] } = useQuery(gymsQuery);
  const { data: links = [] } = useQuery(exerciseLocationsQuery);
  const { data: categories = [] } = useQuery(exerciseCategoriesQuery);
  const { data: equipment = [] } = useQuery(exerciseEquipmentQuery);
  const [newCat, setNewCat] = useState<{ name: string; prefix: string; color: string } | null>(null);
  const [newEq, setNewEq] = useState<string | null>(null);
  const [places, setPlaces] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open) setPlaces(new Set(exercise ? links.filter((l) => l.exercise_id === exercise.id).map((l) => l.gym_id) : gyms.map((g) => g.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise?.id]);
  const [textLanguage, setTextLanguage] = useState<"sv" | "en">(language);
  useEffect(() => {
    if (open) { setTextLanguage(language); setNewCat(null); setNewEq(null); }
  }, [open, language, exercise]);
  useEffect(() => {
    if (!open) return;
    const ex = exercise ? localizeExercise(exercise, textLanguage) : null;
    setF(ex ? { code: ex.code, category_id: ex.category_id ?? "", equipment_id: ex.equipment_id ?? "", name: ex.name, instructions: ex.instructions } : { ...empty });
  }, [open, exercise, textLanguage]);
  const set = (k: "code" | "name" | "instructions") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
  };
  function pickCategory(id: string) {
    if (id === NEW) { setNewCat({ name: "", prefix: "", color: "#0063ff" }); return; }
    setF((cur) => ({ ...cur, category_id: id }));
  }
  async function addCategory() {
    if (!newCat) return;
    const { data, error } = await supabase.from("exercise_categories").insert({ name: newCat.name.trim(), code_prefix: newCat.prefix.trim().toUpperCase(), color_token: newCat.color.toLowerCase(), sort_order: categories.length + 1 }).select().single();
    if (error) { toast.error(error.code === "23505" ? t("common.nameOrPrefixAlreadyExists") : error.message); return; }
    await qc.invalidateQueries({ queryKey: ["exercise-categories"] });
    setNewCat(null);
    setF((cur) => ({ ...cur, category_id: data.id }));
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
    if (!f.category_id) { toast.error(t("exerciseForm.chooseACategory")); return; }
    const row = { code: f.code.trim().toUpperCase(), category_id: f.category_id, equipment_id: f.equipment_id || null, name: f.name.trim(), instructions: f.instructions };
    const texts = { name: row.name, instructions: row.instructions };
    const existing = exercise?.translations;
    const translations = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    const update = textLanguage === "en" && exercise
      ? { code: row.code, category_id: row.category_id, equipment_id: row.equipment_id, translations: { ...translations, en: texts } }
      : row;
    const res = exercise
      ? await supabase.from("exercises").update(update).eq("id", exercise.id).select().single()
      : await supabase.from("exercises").insert({ ...row, ...(textLanguage === "en" ? { translations: { en: texts } } : {}), sort_order: all.length }).select().single();
    if (res.error) {
      toast.error(res.error.code === "23505" ? t("exerciseForm.codeAlreadyExists") : res.error.message);
      return;
    }
    const before = new Set(exercise ? links.filter((l) => l.exercise_id === exercise.id).map((l) => l.gym_id) : []);
    const add = [...places].filter((id) => !before.has(id)).map((gym_id) => ({ exercise_id: res.data.id, gym_id }));
    const drop = [...before].filter((id) => !places.has(id));
    if (add.length) { const { error } = await supabase.from("exercise_locations").insert(add); if (error) toast.error(error.message); }
    if (drop.length) { const { error } = await supabase.from("exercise_locations").delete().eq("exercise_id", res.data.id).in("gym_id", drop); if (error) toast.error(error.message); }
    void qc.invalidateQueries({ queryKey: ["exercise-locations"] });
    // Log rows follow the exercise by id; the database keeps their code in sync.
    invalidate();
    toast.success(t("exerciseForm.exerciseSaved"));
    onClose(res.data as Exercise);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{exercise ? t("exerciseForm.editExercise") : t("exerciseForm.newExercise")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label>{t("exerciseForm.exerciseTextLanguage")}</Label><select aria-label={t("exerciseForm.exerciseTextLanguage")} value={textLanguage} onChange={(e) => setTextLanguage(e.target.value === "en" ? "en" : "sv")} className="h-10 w-full rounded-md border bg-background px-3"><option value="sv">Svenska</option><option value="en">English</option></select></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="ex-cat">{t("common.category")}</Label>
              <select id="ex-cat" required value={newCat ? NEW : f.category_id} onChange={(e) => pickCategory(e.target.value)} className={selectCls}>
                <option value="" disabled>{t("exerciseForm.choose")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code_prefix})</option>)}
                <option value={NEW}>{t("exerciseForm.newCategory")}</option>
              </select>
            </div>
            <div className="space-y-1"><Label htmlFor="ex-code">{t("exerciseForm.code")}</Label><Input id="ex-code" required value={f.code} onChange={set("code")} /></div>
          </div>
          {newCat && <div className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2 rounded-md border border-dashed bg-muted/40 p-2">
            <div className="space-y-1"><Label className="text-xs">{t("common.name")}</Label><Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t("exerciseForm.prefix")}</Label><Input value={newCat.prefix} maxLength={4} onChange={(e) => setNewCat({ ...newCat, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t("common.colour")}</Label>
              <input type="color" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} className="h-10 w-full cursor-pointer rounded-md border bg-background p-1" /></div>
            <div className="flex gap-1"><Button type="button" size="sm" variant="secondary" disabled={!newCat.name.trim() || !newCat.prefix} onClick={addCategory}>{t("common.add")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setNewCat(null)}>✕</Button></div>
          </div>}
          <div className="space-y-1"><Label htmlFor="ex-name">{t("common.name")}</Label><Input id="ex-name" required value={f.name} onChange={set("name")} /></div>
          <div className="space-y-1">
            <Label htmlFor="ex-eq">{t("common.equipment")}</Label>
            <select id="ex-eq" value={newEq !== null ? NEW : f.equipment_id} onChange={(e) => e.target.value === NEW ? setNewEq("") : setF({ ...f, equipment_id: e.target.value })} className={selectCls}>
              <option value="">{t("exerciseForm.none")}</option>
              {equipment.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              <option value={NEW}>{t("exerciseForm.newEquipment")}</option>
            </select>
          </div>
          {newEq !== null && <div className="flex items-end gap-2 rounded-md border border-dashed bg-muted/40 p-2">
            <Input value={newEq} onChange={(e) => setNewEq(e.target.value)} placeholder={t("common.name")} />
            <Button type="button" size="sm" variant="secondary" disabled={!newEq.trim()} onClick={addEquipment}>{t("common.add")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setNewEq(null)}>✕</Button>
          </div>}
          <div className="space-y-1"><Label htmlFor="ex-ins">{t("exerciseForm.instructionsTips")}</Label><Textarea id="ex-ins" rows={5} value={f.instructions} onChange={set("instructions")} /></div>
          {gyms.length > 0 && <fieldset className="space-y-1"><legend className="text-sm font-medium">{t("exerciseForm.locationsWhereThisExerciseIs")}</legend>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4" checked={places.size === gyms.length} onChange={() => setPlaces(places.size === gyms.length ? new Set() : new Set(gyms.map((g) => g.id)))} />{t("common.allLocations")}</label>
            <div className="grid gap-1 pl-6 sm:grid-cols-2">{gyms.map((g) => <label key={g.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={places.has(g.id)} onChange={() => { const n = new Set(places); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); setPlaces(n); }} />{g.name}</label>)}</div>
          </fieldset>}
          {exercise && <ExerciseImageEditor exercise={exercise} />}
          <Button type="submit" className="h-12 w-full font-bold uppercase">{t("common.save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useLanguage, localizeExercise } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, useInvalidateGym, type Exercise } from "@/lib/gym";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gymsQuery } from "@/lib/gym";
import { exerciseLocationsQuery } from "@/lib/exercise-locations";
import { ExerciseImageEditor } from "@/components/gym/ExerciseImageEditor";

const empty = { code: "", category: "", name: "", equipment: "", variant: "", muscles: "", instructions: "", dose: "", focus: "" };

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
  const { t, language, localize } = useLanguage();
  const invalidate = useInvalidateGym();
  const [f, setF] = useState(empty);
  const qc = useQueryClient();
  const { data: gyms = [] } = useQuery(gymsQuery);
  const { data: links = [] } = useQuery(exerciseLocationsQuery);
  const [places, setPlaces] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (open) setPlaces(new Set(exercise ? links.filter((l) => l.exercise_id === exercise.id).map((l) => l.gym_id) : gyms.map((g) => g.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise?.id]);
  const [textLanguage, setTextLanguage] = useState<"sv" | "en">(language);
  useEffect(() => {
    if (open) setTextLanguage(language);
  }, [open, language]);
  useEffect(() => {
    if (open) {
      const translated = exercise ? localizeExercise(exercise, textLanguage) : exercise;
      setF(translated ? { ...empty, ...translated } : { ...empty });
    }
  }, [open, exercise, textLanguage, language]);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const uniq = (k: "category" | "equipment" | "muscles") => [...new Set(all.map((e) => e[k]).filter(Boolean))];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      code: f.code.trim().toUpperCase(), category: f.category.trim(), name: f.name.trim(),
      equipment: f.equipment, variant: f.variant, muscles: f.muscles,
      instructions: f.instructions, dose: f.dose, focus: f.focus,
    };
    const texts = { name: row.name, equipment: row.equipment, variant: row.variant, muscles: row.muscles, instructions: row.instructions, dose: row.dose, focus: row.focus };
    const existing = exercise?.translations;
    const translations = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
    const update = textLanguage === "en" && exercise
      ? { code: row.code, category: row.category, translations: { ...translations, en: texts } }
      : row;
    const res = exercise
      ? await supabase.from("exercises").update(update).eq("id", exercise.id).select().single()
      : await supabase.from("exercises").insert({ ...row, ...(textLanguage === "en" ? { translations: { en: texts } } : {}), sort_order: all.length }).select().single();
    if (res.error) {
      toast.error(res.error.code === "23505" ? t("Koden finns redan", "Code already exists") : res.error.message);
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
    toast.success(t("Övning sparad", "Exercise saved"));
    onClose(res.data);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{exercise ? t("Redigera övning", "Edit exercise") : t("Ny övning", "New exercise")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1"><Label>{t("Övningstexternas språk", "Exercise text language")}</Label><select aria-label={t("Övningstexternas språk", "Exercise text language")} value={textLanguage} onChange={(e) => setTextLanguage(e.target.value === "en" ? "en" : "sv")} className="h-10 w-full rounded-md border bg-background px-3"><option value="sv">Svenska</option><option value="en">English</option></select></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>{t("Kod", "Code")}</Label><Input required value={f.code} onChange={set("code")} placeholder="PU11" /></div>
            <div className="col-span-2 space-y-1">
              <Label>{t("Kategori", "Category")}</Label>
              <Input required list="cats" value={f.category} onChange={set("category")} placeholder="Push" />
              <datalist id="cats">{categoriesOf(all).map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1"><Label>{t("Namn", "Name")}</Label><Input required value={f.name} onChange={set("name")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("Redskap", "Equipment")}</Label>
              <Input list="eq" value={f.equipment} onChange={set("equipment")} />
              <datalist id="eq">{uniq("equipment").map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-1">
              <Label>{t("Muskelgrupp", "Muscle group")}</Label>
              <Input list="mu" value={f.muscles} onChange={set("muscles")} />
              <datalist id="mu">{uniq("muscles").map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1"><Label>{t("Anpassning", "Variation")}</Label><Input value={f.variant} onChange={set("variant")} placeholder={t("Bilateralt / Enarm", "Bilateral / Single arm")} /></div>
          <div className="space-y-1"><Label>{t("Utförande", "Instructions")}</Label><Textarea rows={3} value={f.instructions} onChange={set("instructions")} /></div>
          <div className="space-y-1"><Label>{t("Set × reps", "Sets × reps")}</Label><Input value={f.dose} onChange={set("dose")} placeholder={t("3–4 set × 10–12 reps", "3–4 sets × 10–12 reps")} /></div>
          <div className="space-y-1"><Label>{t("Fokus", "Focus")}</Label><Input value={f.focus} onChange={set("focus")} /></div>
          {gyms.length > 0 && <fieldset className="space-y-1"><legend className="text-sm font-medium">{t("Platser där övningen finns", "Locations where this exercise is available")}</legend>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-4" checked={places.size === gyms.length} onChange={() => setPlaces(places.size === gyms.length ? new Set() : new Set(gyms.map((g) => g.id)))} />{t("Alla platser", "All locations")}</label>
            <div className="grid gap-1 pl-6 sm:grid-cols-2">{gyms.map((g) => <label key={g.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={places.has(g.id)} onChange={() => { const n = new Set(places); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); setPlaces(n); }} />{g.name}</label>)}</div>
          </fieldset>}
          {exercise && <ExerciseImageEditor exercise={exercise} />}
          <Button type="submit" className="h-12 w-full font-bold uppercase">{t("Spara", "Save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

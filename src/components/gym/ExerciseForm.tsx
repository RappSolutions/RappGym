import { useLanguage } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, gymsQuery, useInvalidateGym, type Exercise } from "@/lib/gym";
import { useQuery } from "@tanstack/react-query";
import { useSelectedGym } from "@/hooks/use-gym";

const empty = { gym_id: "", code: "", category: "", name: "", equipment: "", variant: "", muscles: "", instructions: "", dose: "", focus: "" };

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
  const { data: gyms = [] } = useQuery(gymsQuery);
  const [gym] = useSelectedGym();
  useEffect(() => {
    if (open) setF(exercise ? { ...empty, ...exercise, gym_id: exercise.gym_id ?? "" } : { ...empty, gym_id: gym ?? "" });
  }, [open, exercise, gym]);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const uniq = (k: "category" | "equipment" | "muscles") => [...new Set(all.map((e) => e[k]).filter(Boolean))];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      code: f.code.trim().toUpperCase(), category: f.category.trim(), name: f.name.trim(),
      equipment: f.equipment, variant: f.variant, muscles: f.muscles,
      instructions: f.instructions, dose: f.dose, focus: f.focus,
      gym_id: f.gym_id || null,
    };
    const res = exercise
      ? await supabase.from("exercises").update(row).eq("id", exercise.id).select().single()
      : await supabase.from("exercises").insert({ ...row, sort_order: all.length }).select().single();
    if (res.error) {
      toast.error(res.error.code === "23505" ? t("Koden finns redan", "Code already exists") : res.error.message);
      return;
    }
    if (exercise && exercise.code !== row.code) {
      await supabase.from("log_entries").update({ code: row.code }).eq("code", exercise.code);
    }
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>{t("Kod", "Code")}</Label><Input required value={f.code} onChange={set("code")} placeholder="PU11" /></div>
            <div className="col-span-2 space-y-1">
              <Label>{t("Kategori", "Category")}</Label>
              <Input required list="cats" value={f.category} onChange={set("category")} placeholder="Push" />
              <datalist id="cats">{categoriesOf(all).map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Gym</Label>
            <select value={f.gym_id} onChange={set("gym_id")} className="h-10 w-full rounded-md border bg-background px-3">
              <option value="">{t("Alla gym", "All gyms")}</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
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
          <Button type="submit" className="h-12 w-full font-bold uppercase">{t("Spara", "Save")}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { categoriesOf, useInvalidateGym, type Exercise } from "@/lib/gym";

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
  const invalidate = useInvalidateGym();
  const [f, setF] = useState(empty);
  useEffect(() => {
    if (open) setF(exercise ? { ...empty, ...exercise } : empty);
  }, [open, exercise]);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const uniq = (k: "category" | "equipment" | "muscles") => [...new Set(all.map((e) => e[k]).filter(Boolean))];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const row = {
      code: f.code.trim().toUpperCase(), category: f.category.trim(), name: f.name.trim(),
      equipment: f.equipment, variant: f.variant, muscles: f.muscles,
      instructions: f.instructions, dose: f.dose, focus: f.focus,
    };
    const res = exercise
      ? await supabase.from("exercises").update(row).eq("id", exercise.id).select().single()
      : await supabase.from("exercises").insert({ ...row, sort_order: all.length }).select().single();
    if (res.error) return toast.error(res.error.code === "23505" ? "Koden finns redan" : res.error.message);
    if (exercise && exercise.code !== row.code) {
      await supabase.from("log_entries").update({ code: row.code }).eq("code", exercise.code);
    }
    invalidate();
    toast.success("Övning sparad");
    onClose(res.data);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl uppercase">{exercise ? "Redigera övning" : "Ny övning"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Kod</Label><Input required value={f.code} onChange={set("code")} placeholder="PU11" /></div>
            <div className="col-span-2 space-y-1">
              <Label>Kategori</Label>
              <Input required list="cats" value={f.category} onChange={set("category")} placeholder="Push" />
              <datalist id="cats">{categoriesOf(all).map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1"><Label>Namn</Label><Input required value={f.name} onChange={set("name")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Redskap</Label>
              <Input list="eq" value={f.equipment} onChange={set("equipment")} />
              <datalist id="eq">{uniq("equipment").map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="space-y-1">
              <Label>Muskelgrupp</Label>
              <Input list="mu" value={f.muscles} onChange={set("muscles")} />
              <datalist id="mu">{uniq("muscles").map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1"><Label>Anpassning</Label><Input value={f.variant} onChange={set("variant")} placeholder="Bilateralt / Enarm" /></div>
          <div className="space-y-1"><Label>Utförande</Label><Textarea rows={3} value={f.instructions} onChange={set("instructions")} /></div>
          <div className="space-y-1"><Label>Varv × reps</Label><Input value={f.dose} onChange={set("dose")} placeholder="3–4 varv × 10–12 reps" /></div>
          <div className="space-y-1"><Label>Fokus</Label><Input value={f.focus} onChange={set("focus")} /></div>
          <Button type="submit" className="h-12 w-full font-bold uppercase">Spara</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { exerciseCategoriesQuery, exerciseEquipmentQuery, exercisesQuery, useInvalidateGym } from "@/lib/gym";
import { tokenToHex } from "@/lib/category-color";

type Draft = { id: string; name: string; prefix: string; color: string };

/** Admin CRUD for the category and equipment lookup tables; used rows are protected by FK RESTRICT. */
export function RefsManager({ only }: { only: "cat" | "eq" }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const invalidate = useInvalidateGym();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: categories = [] } = useQuery(exerciseCategoriesQuery);
  const { data: equipment = [] } = useQuery(exerciseEquipmentQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const catCount = (id: string) => exercises.filter((e) => e.category_id === id).length;
  const eqCount = (id: string) => exercises.filter((e) => e.equipment_id === id).length;
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["exercise-categories"] }); await qc.invalidateQueries({ queryKey: ["exercise-equipment"] }); invalidate(); };
  const dup = (code?: string) => code === "23505";

  async function saveCat() {
    if (!draft) return;
    const { error } = await supabase.from("exercise_categories").update({ name: draft.name.trim(), code_prefix: draft.prefix.trim().toUpperCase(), color_token: draft.color.toLowerCase() }).eq("id", draft.id);
    if (error) { toast.error(dup(error.code) ? t("Namn eller prefix finns redan", "Name or prefix already exists") : error.message); return; }
    setDraft(null); await refresh();
  }
  async function saveEq() {
    if (!draft) return;
    const { error } = await supabase.from("exercise_equipment").update({ name: draft.name.trim() }).eq("id", draft.id);
    if (error) { toast.error(dup(error.code) ? t("Redskapet finns redan", "Equipment already exists") : error.message); return; }
    setDraft(null); await refresh();
  }
  async function remove(table: "exercise_categories" | "exercise_equipment", id: string, name: string, used: number) {
    if (used) { toast.error(t(`${name} används av ${used} övningar och kan inte raderas.`, `${name} is used by ${used} exercises and can't be deleted.`)); return; }
    if (!await confirmDialog(t(`Radera ${name} permanent?`, `Permanently delete ${name}?`))) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  }

  const actions = (onEdit: () => void, onDelete: () => void, used: number) => (
    <><span className="w-8 text-right text-xs tabular-nums text-muted-foreground" title={t("Övningar", "Exercises")}>{used}</span>
      <Button size="icon" variant="ghost" className="size-8" aria-label={t("Ändra", "Edit")} onClick={onEdit}><Pencil className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8" aria-label={t("Ta bort", "Delete")} onClick={onDelete}><Trash2 className="size-4" /></Button></>
  );
  const saveCancel = (onSave: () => void, ok: boolean) => (
    <><Button size="icon" variant="ghost" className="size-8" aria-label={t("Spara", "Save")} disabled={!ok} onClick={onSave}><Check className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8" aria-label={t("Avbryt", "Cancel")} onClick={() => setDraft(null)}><X className="size-4" /></Button></>
  );

  return (
    <section className="space-y-1">
      {only === "cat" && <div className="space-y-1">{categories.map((c) => {
        const used = catCount(c.id);
        const ed = draft?.id === c.id ? draft : null;
        return <div key={c.id} data-category={c.color_token} className="category-theme flex items-center gap-2 py-0.5">
          {ed ? <>
            <input type="color" aria-label={t("Färg", "Colour")} value={ed.color} onChange={(e) => setDraft({ ...ed, color: e.target.value })} className="size-8 shrink-0 cursor-pointer rounded border bg-background p-0.5" />
            <Input value={ed.name} onChange={(e) => setDraft({ ...ed, name: e.target.value })} className="h-8 flex-1" />
            <Input value={ed.prefix} maxLength={4} onChange={(e) => setDraft({ ...ed, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} className="h-8 w-16" />
            {saveCancel(() => void saveCat(), !!ed.name.trim() && !!ed.prefix)}
          </> : <>
            <span className="size-4 shrink-0 rounded-full bg-category-fill" aria-hidden />
            <span className="flex-1 truncate text-sm">{c.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{c.code_prefix}</span>
            {actions(() => setDraft({ id: c.id, name: c.name, prefix: c.code_prefix, color: tokenToHex(c.color_token) }), () => void remove("exercise_categories", c.id, c.name, used), used)}
          </>}
        </div>;
      })}</div>}
      {only === "eq" && <div className="space-y-1">{equipment.map((q) => {
        const used = eqCount(q.id);
        const ed = draft?.id === q.id ? draft : null;
        return <div key={q.id} className="flex items-center gap-2 py-0.5">
          {ed ? <><Input value={ed.name} onChange={(e) => setDraft({ ...ed, name: e.target.value })} className="h-8 flex-1" />{saveCancel(() => void saveEq(), !!ed.name.trim())}</>
            : <><span className="flex-1 truncate text-sm">{q.name}</span>{actions(() => setDraft({ id: q.id, name: q.name, prefix: "", color: "" }), () => void remove("exercise_equipment", q.id, q.name, used), used)}</>}
        </div>;
      })}</div>}
    </section>
  );
}

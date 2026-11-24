import { useState } from "react";
import { useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { exerciseCategoriesQuery, exerciseEquipmentQuery, exercisesQuery, gymsQuery, useInvalidateGym } from "@/lib/gym";
import { gymEquipmentQuery } from "@/lib/exercise-locations";
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
  const { data: gyms = [] } = useQuery(gymsQuery);
  const { data: links = [] } = useQuery(gymEquipmentQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openEq, setOpenEq] = useState<string | null>(null);
  const catCount = (id: string) => exercises.filter((e) => e.category_id === id).length;
  const eqCount = (id: string) => exercises.filter((e) => e.equipment_id === id).length;
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["exercise-categories"] }); await qc.invalidateQueries({ queryKey: ["exercise-equipment"] }); invalidate(); };
  const dup = (code?: string) => code === "23505";

  async function saveCat() {
    if (!draft) return;
    const { error } = await supabase.from("exercise_categories").update({ name: draft.name.trim(), code_prefix: draft.prefix.trim().toUpperCase(), color_token: draft.color.toLowerCase() }).eq("id", draft.id);
    if (error) { toast.error(dup(error.code) ? t("common.nameOrPrefixAlreadyExists") : error.message); return; }
    setDraft(null); await refresh();
  }
  async function saveEq() {
    if (!draft) return;
    const { error } = await supabase.from("exercise_equipment").update({ name: draft.name.trim() }).eq("id", draft.id);
    if (error) { toast.error(dup(error.code) ? t("common.equipmentAlreadyExists") : error.message); return; }
    setDraft(null); await refresh();
  }
  async function remove(table: "exercise_categories" | "exercise_equipment", id: string, name: string, used: number) {
    if (used) { toast.error(t("refsManager.isUsedByExercisesAnd", { name, used })); return; }
    if (!await confirmDialog(t("refsManager.permanentlyDelete", { name }))) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await refresh();
  }

  const actions = (onEdit: () => void, onDelete: () => void, used: number) => (
    <><span className="w-8 text-right text-xs tabular-nums text-muted-foreground" title={t("common.exercises")}>{used}</span>
      <Button size="icon" variant="ghost" className="size-8" aria-label={t("refsManager.edit")} onClick={onEdit}><Pencil className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8" aria-label={t("common.delete")} onClick={onDelete}><Trash2 className="size-4" /></Button></>
  );
  const saveCancel = (onSave: () => void, ok: boolean) => (
    <><Button size="icon" variant="ghost" className="size-8" aria-label={t("common.save")} disabled={!ok} onClick={onSave}><Check className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8" aria-label={t("common.cancel")} onClick={() => setDraft(null)}><X className="size-4" /></Button></>
  );

  function EquipmentDetails({ eqId }: { eqId: string }) {
    const at = links.filter((l) => l.equipment_id === eqId).map((l) => ({ gym: gyms.find((g) => g.id === l.gym_id), max: l.max_load_kg })).filter((x) => x.gym);
    const byCat = categories.map((c) => ({ c, list: exercises.filter((e) => e.equipment_id === eqId && e.category_id === c.id) })).filter((x) => x.list.length);
    return <div className="mb-2 ml-5 space-y-2 border-l pl-3 text-xs">
      <div><div className="font-medium text-muted-foreground">{t("settings.locations")}</div>
        {at.length ? <div className="flex flex-wrap gap-1 pt-1">{at.map((x) => <span key={x.gym!.id} className="rounded border px-1.5 py-0.5">{x.gym!.name}{x.max != null && ` · max ${x.max} kg`}</span>)}</div> : <div className="text-muted-foreground">{t("refsManager.noLocations")}</div>}</div>
      <div><div className="font-medium text-muted-foreground">{t("common.exercises")}</div>
        {byCat.length ? byCat.map(({ c, list }) => <div key={c.id} data-category={c.color_token} className="category-theme flex flex-wrap gap-1 pt-1">{list.map((e) => <span key={e.id} className={`rounded bg-category-fill px-1.5 py-0.5 text-category-on ${e.is_active === false ? "opacity-50" : ""}`}><span className="font-mono">{e.code}</span> {e.name}</span>)}</div>) : <div className="text-muted-foreground">{t("refsManager.noExercises")}</div>}</div>
    </div>;
  }

  return (
    <section className="space-y-1">
      {only === "cat" && <div className="space-y-1">{categories.map((c) => {
        const used = catCount(c.id);
        const ed = draft?.id === c.id ? draft : null;
        return <div key={c.id} data-category={c.color_token} className="category-theme flex items-center gap-2 py-0.5">
          {ed ? <>
            <input type="color" aria-label={t("common.colour")} value={ed.color} onChange={(e) => setDraft({ ...ed, color: e.target.value })} className="size-8 shrink-0 cursor-pointer rounded border bg-background p-0.5" />
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
        return <div key={q.id}><div className="flex items-center gap-2 py-0.5">
          {ed ? <><Input value={ed.name} onChange={(e) => setDraft({ ...ed, name: e.target.value })} className="h-8 flex-1" />{saveCancel(() => void saveEq(), !!ed.name.trim())}</>
            : <><button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm" aria-expanded={openEq === q.id} onClick={() => setOpenEq(openEq === q.id ? null : q.id)}>{openEq === q.id ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}<span className="truncate">{q.name}</span></button>{actions(() => setDraft({ id: q.id, name: q.name, prefix: "", color: "" }), () => void remove("exercise_equipment", q.id, q.name, used), used)}</>}
        </div>
        {openEq === q.id && !ed && <EquipmentDetails eqId={q.id} />}
        </div>;
      })}</div>}
    </section>
  );
}

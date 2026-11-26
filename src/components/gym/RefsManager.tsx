import { useState } from "react";
import { useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supportedLanguages } from "@/lib/i18n-core";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { exerciseCategoriesQuery, exerciseEquipmentQuery, exercisesQuery, gymsQuery, useInvalidateGym } from "@/lib/gym";
import { gymEquipmentQuery } from "@/lib/exercise-locations";
import { tokenToHex } from "@/lib/category-color";

type Draft = { id: string; name: string; tr: Record<string, string>; prefix: string; color: string };
const NEW = "new";
/** Non-base languages; English is the base column, every other supported language is a translations key. */
const TR_LANGS = supportedLanguages.filter((l) => l !== "en");
const obj = (v: Json | undefined): Record<string, Json | undefined> => v && typeof v === "object" && !Array.isArray(v) ? v : {};
function trNames(v: Json): Record<string, string> {
  const o = obj(v); const out: Record<string, string> = {};
  for (const l of TR_LANGS) { const n = obj(o[l])["name"]; out[l] = typeof n === "string" ? n : ""; }
  return out;
}
/** Merge edited names per language into existing translations; empty removes the key so the English base shows. */
function withNames(existing: Json | undefined, tr: Record<string, string>): Json {
  const base = { ...obj(existing) };
  for (const l of TR_LANGS) { const v = (tr[l] ?? "").trim(); if (v) base[l] = { ...obj(base[l]), name: v }; else delete base[l]; }
  return base as Json;
}

/** Admin CRUD for the category and equipment lookup tables; used rows are protected by FK RESTRICT. */
export function RefsManager({ only }: { only: "cat" | "eq" }) {
  const { t, refName, localize } = useLanguage();
  const { language } = useLanguage();
  const langName = (l: string) => { try { return new Intl.DisplayNames([language], { type: "language" }).of(l) ?? l; } catch { return l; } };
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
    const cur = categories.find((c) => c.id === draft.id);
    const row = { name: draft.name.trim(), code_prefix: draft.prefix.trim().toUpperCase(), color_token: draft.color.toLowerCase(), translations: withNames(cur?.translations, draft.tr) };
    const { error } = draft.id === NEW
      ? await supabase.from("exercise_categories").insert({ ...row, sort_order: categories.length + 1 })
      : await supabase.from("exercise_categories").update(row).eq("id", draft.id);
    if (error) { toast.error(dup(error.code) ? t("common.nameOrPrefixAlreadyExists") : error.message); return; }
    setDraft(null); await refresh();
  }
  async function saveEq() {
    if (!draft) return;
    const cur = equipment.find((q) => q.id === draft.id);
    const row = { name: draft.name.trim(), translations: withNames(cur?.translations, draft.tr) };
    const { error } = draft.id === NEW
      ? await supabase.from("exercise_equipment").insert(row)
      : await supabase.from("exercise_equipment").update(row).eq("id", draft.id);
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
  function EquipmentDetails({ eqId }: { eqId: string }) {
    const at = links.filter((l) => l.equipment_id === eqId).map((l) => ({ gym: gyms.find((g) => g.id === l.gym_id), max: l.max_load_kg })).filter((x) => x.gym);
    const byCat = categories.map((c) => ({ c, list: exercises.filter((e) => e.equipment_id === eqId && e.category_id === c.id) })).filter((x) => x.list.length);
    return <div className="mb-2 ml-5 space-y-2 border-l pl-3 text-xs">
      <div><div className="font-medium text-muted-foreground">{t("settings.locations")}</div>
        {at.length ? <div className="flex flex-wrap gap-1 pt-1">{at.map((x) => <span key={x.gym!.id} className="rounded border px-1.5 py-0.5">{x.gym!.name}{x.max != null && ` · max ${x.max} kg`}</span>)}</div> : <div className="text-muted-foreground">{t("refsManager.noLocations")}</div>}</div>
      <div><div className="font-medium text-muted-foreground">{t("common.exercises")}</div>
        {byCat.length ? byCat.map(({ c, list }) => <div key={c.id} data-category={c.color_token} className="category-theme flex flex-wrap gap-1 pt-1">{list.map((e) => <span key={e.id} className={`rounded bg-category-fill px-1.5 py-0.5 text-category-on ${e.is_active === false ? "opacity-50" : ""}`}><span className="font-mono">{e.code}</span> {localize(e).name}</span>)}</div>) : <div className="text-muted-foreground">{t("refsManager.noExercises")}</div>}</div>
    </div>;
  }

  const editor = (ed: Draft, kind: "cat" | "eq") => {
    const ok = !!ed.name.trim() && (kind === "eq" || !!ed.prefix);
    const field = (id: string, label: string, value: string, set: (v: string) => void, required = false) =>
      <div className="space-y-1"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} required={required} onChange={(e) => set(e.target.value)} /></div>;
    return <Dialog open onOpenChange={(o) => { if (!o) setDraft(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{ed.id === NEW ? t(kind === "cat" ? "refsManager.newCategory" : "refsManager.newEquipment") : t(kind === "cat" ? "refsManager.editCategory" : "refsManager.editEquipment")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {field("ref-name-en", `${t("refsManager.nameIn", { lang: langName("en") })} (${t("refsManager.baseLanguage")})`, ed.name, (v) => setDraft({ ...ed, name: v }), true)}
          {TR_LANGS.map((l) => <div key={l}>{field(`ref-name-${l}`, t("refsManager.nameIn", { lang: langName(l) }), ed.tr[l] ?? "", (v) => setDraft({ ...ed, tr: { ...ed.tr, [l]: v } }))}</div>)}
          {kind === "cat" && <div className="flex items-end gap-4">
            <div className="space-y-1"><Label htmlFor="ref-prefix">{t("refsManager.prefix")}</Label><Input id="ref-prefix" value={ed.prefix} maxLength={4} placeholder="XX" className="w-24 font-mono" onChange={(e) => setDraft({ ...ed, prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} /></div>
            <div className="space-y-1"><Label htmlFor="ref-color">{t("refsManager.colour")}</Label><input id="ref-color" type="color" value={ed.color} onChange={(e) => setDraft({ ...ed, color: e.target.value })} className="block h-9 w-14 cursor-pointer rounded border bg-background p-0.5" /></div>
          </div>}
        </div>
        <DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setDraft(null)}>{t("common.cancel")}</Button><Button variant="outline" disabled={!ok} onClick={() => void (kind === "cat" ? saveCat() : saveEq())}>{t("common.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>;
  };
  const newDraft = draft?.id === NEW ? draft : null;
  const addButton = (label: string, d: Draft) => !newDraft && <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-muted-foreground" onClick={() => setDraft(d)}><Plus className="size-4" />{label}</Button>;

  return (
    <section className="space-y-1">
      {only === "cat" && <div className="space-y-1">{categories.map((c) => {
        const used = catCount(c.id);
                return <div key={c.id} data-category={c.color_token} className="category-theme flex items-center gap-2 py-0.5">
          {<>
            <span className="size-4 shrink-0 rounded-full bg-category-fill" aria-hidden />
            <span className="flex-1 truncate text-sm">{refName(c)}</span>
            <span className="font-mono text-xs text-muted-foreground">{c.code_prefix}</span>
            {actions(() => setDraft({ id: c.id, name: c.name, tr: trNames(c.translations), prefix: c.code_prefix, color: tokenToHex(c.color_token) }), () => void remove("exercise_categories", c.id, refName(c), used), used)}
          </>}
        </div>;
      })}
        {addButton(t("refsManager.newCategory"), { id: NEW, name: "", tr: {}, prefix: "", color: "#0063ff" })}
        {draft && editor(draft, "cat")}
      </div>}
      {only === "eq" && <div className="space-y-1">{[...equipment].sort((a, b) => refName(a).localeCompare(refName(b))).map((q) => {
        const used = eqCount(q.id);
                return <div key={q.id}><div className="flex items-center gap-2 py-0.5">
          {<><button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm" aria-expanded={openEq === q.id} onClick={() => setOpenEq(openEq === q.id ? null : q.id)}>{openEq === q.id ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}<span className="truncate">{refName(q)}</span></button>{actions(() => setDraft({ id: q.id, name: q.name, tr: trNames(q.translations), prefix: "", color: "" }), () => void remove("exercise_equipment", q.id, refName(q), used), used)}</>}
        </div>
        {openEq === q.id && <EquipmentDetails eqId={q.id} />}
        </div>;
      })}
        {addButton(t("refsManager.newEquipment"), { id: NEW, name: "", tr: {}, prefix: "", color: "" })}
        {draft && editor(draft, "eq")}
      </div>}
    </section>
  );
}

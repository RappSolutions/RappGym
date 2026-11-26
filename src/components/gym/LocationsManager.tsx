import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, Dumbbell, MapPin, Pencil, Plus, Trash2, X , Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { exerciseEquipmentQuery, exercisesQuery, gymsQuery, type Gym } from "@/lib/gym";
import { equipmentAt, exercisesAtLocation, gymEquipmentQuery } from "@/lib/exercise-locations";
import { useSelectedGym } from "@/hooks/use-gym";
import { LocationPhotoScan } from "@/components/gym/LocationPhotoScan";

export function LocationsManager() {
  const { t, localize, refName } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: links } = useSuspenseQuery(gymEquipmentQuery);
  const { data: equipment } = useSuspenseQuery(exerciseEquipmentQuery);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshLinks = () => qc.invalidateQueries({ queryKey: ["gym-equipment"] });
  async function addLinks(gymId: string, ids: string[]) {
    const have = equipmentAt(links, gymId);
    const rows = ids.filter((id) => !have.has(id)).map((equipment_id) => ({ gym_id: gymId, equipment_id }));
    if (!rows.length) return;
    setBusy(true);
    const { error } = await supabase.from("gym_equipment").insert(rows);
    setBusy(false);
    if (error) toast.error(error.message);
    await refreshLinks();
  }
  async function removeLinks(gymId: string, ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    const { error } = await supabase.from("gym_equipment").delete().eq("gym_id", gymId).in("equipment_id", ids);
    setBusy(false);
    if (error) toast.error(error.message);
    await refreshLinks();
  }
  async function setMax(gymId: string, equipmentId: string, raw: string) {
    const v = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (v !== null && !(v > 0)) { toast.error(t("locationsManager.maxLoadInvalid")); return; }
    const { error } = await supabase.from("gym_equipment").update({ max_load_kg: v }).eq("gym_id", gymId).eq("equipment_id", equipmentId);
    if (error) toast.error(error.message);
    await refreshLinks();
  }
  async function applyScan(g: Gym, ids: string[], note0: string) {
    const keep = new Set(ids);
    const drop = [...equipmentAt(links, g.id)].filter((id) => !keep.has(id));
    await removeLinks(g.id, drop);
    await addLinks(g.id, ids);
    const note = `${t("locationsManager.equipment")}: ${note0}`;
    const description = (g.description ? `${g.description.split(/\s*—?\s*(?:Utrustning|Equipment): /)[0]!.trim()} — ${note}` : note).slice(0, 300);
    await supabase.from("gyms").update({ description }).eq("id", g.id);
    refresh();
  }
  const qc = useQueryClient();
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [selected, setSelected] = useSelectedGym();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [fresh, setFresh] = useState({ name: "", description: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["gyms"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!fresh.name.trim()) return;
    const { data: created, error } = await supabase.from("gyms").insert({ name: fresh.name.trim(), description: fresh.description.trim() }).select("id").single();
    if (error) { toast.error(error.message); return; }
    if (equipment.length) {
      const { error: linkError } = await supabase.from("gym_equipment").insert(equipment.map((q) => ({ equipment_id: q.id, gym_id: created.id })));
      if (linkError) toast.error(linkError.message);
      await refreshLinks();
    }
    setOpenId(created.id);
    setFresh({ name: "", description: "" });
    refresh();
  }
  async function save(g: Gym) {
    if (!draft.name.trim()) return;
    const { error } = await supabase.from("gyms").update({ name: draft.name.trim(), description: draft.description.trim() }).eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    setEditing(null);
    refresh();
  }
  async function togglePublic(g: Gym) {
    const { error } = await supabase.from("gyms").update({ is_public: !g.is_public }).eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function remove(g: Gym) {
    if (!await confirmDialog(t("locationsManager.delete", { name: g.name }))) return;
    const { error } = await supabase.from("gyms").delete().eq("id", g.id);
    if (error) {
      toast.error(error.code === "23503" ? t("locationsManager.thisLocationIsUsedIn") : error.message);
      return;
    }
    if (selected === g.id) setSelected(null);
    refresh();
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("locationsManager.whereYouTrainEveryLogged")}</p>
      {gyms.map((g) => editing === g.id ? (
        <div key={g.id} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input aria-label={t("common.name")} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input aria-label={t("locationsManager.description")} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="flex gap-1">
            <Button size="icon" onClick={() => void save(g)} aria-label={t("common.save")}><Check /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label={t("common.cancel")}><X /></Button>
          </div>
        </div>
      ) : (
        <div key={g.id} className="rounded-lg border">
        <div className="flex items-center gap-3 p-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{g.name}</div>
            {g.description && <div className="text-sm text-muted-foreground">{g.description}</div>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => void togglePublic(g)} aria-pressed={g.is_public} title={g.is_public ? t("locationsManager.sharedWithAllUsers") : t("locationsManager.ownerAndAdminOnly")} aria-label={g.is_public ? t("locationsManager.sharedWithAllUsers") : t("locationsManager.ownerAndAdminOnly")}>{g.is_public ? <Globe className="text-primary" /> : <Lock className="text-muted-foreground" />}</Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(g.id); setDraft({ name: g.name, description: g.description }); }} aria-label={t("common.edit")}><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={() => void remove(g)} aria-label={t("common.delete")}><Trash2 /></Button>
        </div>
        {(() => {
          const here = equipmentAt(links, g.id);
          const open = openId === g.id;
          const allIds = equipment.map((q) => q.id);
          const available = exercisesAtLocation(exercises, links, g.id).length;
          return <div className="border-t px-3 py-2">
            <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-0" aria-expanded={open} onClick={() => setOpenId(open ? null : g.id)}>
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}<Dumbbell className="size-4 text-primary" />{t("locationsManager.equipmentHere")}<span className="ml-auto text-sm text-muted-foreground">{t("locationsManager.equipmentCount", { have: here.size, all: equipment.length, exercises: available })}</span>
            </Button>
            {open && <div className="space-y-3 pb-2">
              <LocationPhotoScan gymId={g.id} onApply={(ids, eq) => applyScan(g, ids, eq)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy || here.size === equipment.length} onClick={() => void addLinks(g.id, allIds)}>{t("locationsManager.addAll")}</Button>
                <Button size="sm" variant="outline" disabled={busy || here.size === 0} onClick={() => void removeLinks(g.id, [...here])}>{t("locationsManager.removeAll")}</Button>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">{[...equipment].sort((a, b) => refName(a).localeCompare(refName(b))).map((q) => {
                const n = exercises.filter((e) => e.equipment_id === q.id).length;
                const link = links.find((l) => l.gym_id === g.id && l.equipment_id === q.id);
                return <div key={q.id} className="flex items-center gap-2 text-sm"><label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" className="size-4" checked={!!link} disabled={busy} onChange={() => void (link ? removeLinks(g.id, [q.id]) : addLinks(g.id, [q.id]))} /><span className="truncate">{refName(q)}</span><span className="text-xs text-muted-foreground">({n})</span></label>
                  {link && <Input key={`${link.max_load_kg ?? ""}`} inputMode="decimal" defaultValue={link.max_load_kg ?? ""} placeholder={t("locationsManager.maxKg")} aria-label={t("locationsManager.maxLoadFor", { name: refName(q) })} className="h-7 w-20 text-xs" onBlur={(e) => { if (e.target.value.trim() !== String(link.max_load_kg ?? "")) void setMax(g.id, q.id, e.target.value); }} />}</div>;
              })}</div>
              <p className="text-xs text-muted-foreground">{t("locationsManager.noEquipmentAlways")}</p>
            </div>}
          </div>;
        })()}
        </div>
      ))}
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} placeholder={t("locationsManager.newLocationEGSats")} />
        <Input value={fresh.description} onChange={(e) => setFresh({ ...fresh, description: e.target.value })} placeholder={t("locationsManager.descriptionOptional")} />
        <Button type="submit" variant="secondary"><Plus />{t("common.add")}</Button>
      </form>
    </section>
  );
}

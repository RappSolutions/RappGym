import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronRight, Dumbbell, MapPin, Pencil, Plus, Trash2, X , Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, exercisesQuery, gymsQuery, type Gym } from "@/lib/gym";
import { exerciseLocationsQuery, missingLinks } from "@/lib/exercise-locations";
import { useSelectedGym } from "@/hooks/use-gym";
import { LocationPhotoScan } from "@/components/gym/LocationPhotoScan";

export function LocationsManager() {
  const { t, localize } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: links } = useSuspenseQuery(exerciseLocationsQuery);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshLinks = () => qc.invalidateQueries({ queryKey: ["exercise-locations"] });
  async function addLinks(gymId: string, ids: string[]) {
    const rows = missingLinks(ids, links, gymId);
    if (!rows.length) return;
    setBusy(true);
    const { error } = await supabase.from("exercise_locations").insert(rows);
    setBusy(false);
    if (error) toast.error(error.message);
    await refreshLinks();
  }
  async function removeLinks(gymId: string, ids: string[]) {
    setBusy(true);
    const { error } = await supabase.from("exercise_locations").delete().eq("gym_id", gymId).in("exercise_id", ids);
    setBusy(false);
    if (error) toast.error(error.message);
    await refreshLinks();
  }
  async function applyScan(g: Gym, ids: string[], equipment: string) {
    const keep = new Set(ids);
    const current = links.filter((l) => l.gym_id === g.id).map((l) => l.exercise_id);
    const drop = current.filter((id) => !keep.has(id));
    if (drop.length) await removeLinks(g.id, drop);
    await addLinks(g.id, ids);
    const note = `${t("Utrustning", "Equipment")}: ${equipment}`;
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
    if (exercises.length) {
      const { error: linkError } = await supabase.from("exercise_locations").insert(exercises.map((e) => ({ exercise_id: e.id, gym_id: created.id })));
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
    if (!await confirmDialog(t(`Ta bort ${g.name}?`, `Delete ${g.name}?`))) return;
    const { error } = await supabase.from("gyms").delete().eq("id", g.id);
    if (error) {
      toast.error(error.code === "23503" ? t("Platsen finns i din logg och kan inte tas bort. Byt namn istället.", "This location is used in your log and can't be deleted. Rename it instead.") : error.message);
      return;
    }
    if (selected === g.id) setSelected(null);
    refresh();
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-display text-2xl font-bold uppercase">{t("Platser", "Locations")}</h2>
      <p className="text-sm text-muted-foreground">{t("Var du tränar. Varje loggat set sparar platsen.", "Where you train. Every logged set remembers the location.")}</p>
      {gyms.map((g) => editing === g.id ? (
        <div key={g.id} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input aria-label={t("Namn", "Name")} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input aria-label={t("Beskrivning", "Description")} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="flex gap-1">
            <Button size="icon" onClick={() => void save(g)} aria-label={t("Spara", "Save")}><Check /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} aria-label={t("Avbryt", "Cancel")}><X /></Button>
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
          <Button size="icon" variant="ghost" onClick={() => void togglePublic(g)} aria-pressed={g.is_public} title={g.is_public ? t("Delad med alla användare", "Shared with all users") : t("Endast ägare och admin", "Owner and admin only")} aria-label={g.is_public ? t("Delad med alla användare", "Shared with all users") : t("Endast ägare och admin", "Owner and admin only")}>{g.is_public ? <Globe className="text-primary" /> : <Lock className="text-muted-foreground" />}</Button>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(g.id); setDraft({ name: g.name, description: g.description }); }} aria-label={t("Redigera", "Edit")}><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={() => void remove(g)} aria-label={t("Ta bort", "Delete")}><Trash2 /></Button>
        </div>
        {(() => {
          const here = new Set(links.filter((l) => l.gym_id === g.id).map((l) => l.exercise_id));
          const open = openId === g.id;
          const allIds = exercises.map((e) => e.id);
          return <div className="border-t px-3 py-2">
            <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-0" aria-expanded={open} onClick={() => setOpenId(open ? null : g.id)}>
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}<Dumbbell className="size-4 text-primary" />{t("Övningar här", "Exercises here")}<span className="ml-auto text-sm text-muted-foreground">{here.size} / {exercises.length}</span>
            </Button>
            {open && <div className="space-y-3 pb-2">
              <LocationPhotoScan gymId={g.id} onApply={(ids, eq) => applyScan(g, ids, eq)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy || here.size === exercises.length} onClick={() => void addLinks(g.id, allIds)}>{t("Lägg till alla", "Add all")}</Button>
                <Button size="sm" variant="outline" disabled={busy || here.size === 0} onClick={() => void removeLinks(g.id, [...here])}>{t("Ta bort alla", "Remove all")}</Button>
              </div>
              {categoriesOf(exercises).map((cat) => {
                const inCat = exercises.filter((e) => e.category === cat);
                const ids = inCat.map((e) => e.id);
                const allIn = ids.every((id) => here.has(id));
                return <div key={cat} className="space-y-1">
                  <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="size-4" checked={allIn} disabled={busy} onChange={() => void (allIn ? removeLinks(g.id, ids) : addLinks(g.id, ids))} />{localize(inCat[0]!).category}</label>
                  <div className="grid gap-1 pl-6 sm:grid-cols-2">{inCat.map((e) => <label key={e.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={here.has(e.id)} disabled={busy} onChange={() => void (here.has(e.id) ? removeLinks(g.id, [e.id]) : addLinks(g.id, [e.id]))} /><span className="font-semibold">{e.code}</span> {localize(e).name}</label>)}</div>
                </div>;
              })}
            </div>}
          </div>;
        })()}
        </div>
      ))}
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} placeholder={t("Ny plats, t.ex. SATS City", "New location, e.g. SATS City")} />
        <Input value={fresh.description} onChange={(e) => setFresh({ ...fresh, description: e.target.value })} placeholder={t("Beskrivning (valfri)", "Description (optional)")} />
        <Button type="submit" variant="secondary"><Plus />{t("Lägg till", "Add")}</Button>
      </form>
    </section>
  );
}

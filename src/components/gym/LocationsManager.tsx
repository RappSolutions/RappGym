import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { gymsQuery, type Gym } from "@/lib/gym";
import { useSelectedGym } from "@/hooks/use-gym";

export function LocationsManager() {
  const { t } = useLanguage();
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
    const { error } = await supabase.from("gyms").insert({ name: fresh.name.trim(), description: fresh.description.trim() });
    if (error) { toast.error(error.message); return; }
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
  async function remove(g: Gym) {
    if (!confirm(t(`Ta bort ${g.name}?`, `Delete ${g.name}?`))) return;
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
        <div key={g.id} className="flex items-center gap-3 rounded-lg border p-3">
          <MapPin className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{g.name}</div>
            {g.description && <div className="text-sm text-muted-foreground">{g.description}</div>}
          </div>
          <Button size="icon" variant="ghost" onClick={() => { setEditing(g.id); setDraft({ name: g.name, description: g.description }); }} aria-label={t("Redigera", "Edit")}><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={() => void remove(g)} aria-label={t("Ta bort", "Delete")}><Trash2 /></Button>
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

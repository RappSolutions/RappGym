import { useLanguage } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { Home, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateGym, type Gym } from "@/lib/gym";
import { useQueryClient } from "@tanstack/react-query";

export function GymPicker({ gyms, selected, onPick }: { gyms: Gym[]; selected: string | null; onPick: (id: string) => void }) {
  const { t, language, localize } = useLanguage();
  const qc = useQueryClient();
  const invalidate = useInvalidateGym();
  const [name, setName] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data, error } = await supabase.from("gyms").insert({ name: name.trim() }).select().single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    await qc.invalidateQueries({ queryKey: ["gyms"] });
    invalidate();
    onPick(data.id);
  }
  return (
    <div className="space-y-3">
      <h1 className="text-4xl font-extrabold uppercase">{t("Var tränar du?", "Where are you training?")}</h1>
      {gyms.map((g, i) => (
        <button key={g.id} onClick={() => onPick(g.id)}
          className={`flex w-full items-center gap-4 rounded-xl border-2 bg-card p-5 text-left ${g.id === selected ? "border-primary" : "border-border"}`}>
          {i === 0 ? <Home className="h-7 w-7 text-primary" /> : <MapPin className="h-7 w-7 text-primary" />}
          <span>
            <span className="block font-display text-2xl font-bold uppercase">{g.name}</span>
            {g.description && <span className="text-sm text-muted-foreground">{g.description}</span>}
          </span>
        </button>
      ))}
      <form onSubmit={add} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Nytt gym, t.ex. SATS City", "New gym, e.g. SATS City")} className="h-12" />
        <Button type="submit" variant="secondary" className="h-12"><Plus className="h-5 w-5" /> Lägg till</Button>
      </form>
    </div>
  );
}

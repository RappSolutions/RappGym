import { useLanguage } from "@/lib/i18n";
import { Home, MapPin } from "lucide-react";
import type { Gym } from "@/lib/gym";

export function GymPicker({ gyms, selected, onPick }: { gyms: Gym[]; selected: string | null; onPick: (id: string) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <h1 className="text-4xl font-extrabold uppercase">{t("gymPicker.whereAreYouTraining")}</h1>
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
    </div>
  );
}

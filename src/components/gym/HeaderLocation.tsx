import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { gymsQuery } from "@/lib/gym";
import { useSelectedGym } from "@/hooks/use-gym";
import { useLanguage } from "@/lib/i18n";

export function HeaderLocation() {
  const { t } = useLanguage();
  const { data: gyms = [] } = useQuery(gymsQuery);
  const [gymId, setGym] = useSelectedGym();
  if (!gyms.length) return null;
  return (
    <label className="flex min-w-0 items-center gap-1 rounded-md border border-brand-yellow/60 bg-brand-royal/40 px-2 text-brand-yellow">
      <MapPin className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("Plats", "Location")}</span>
      <select value={gymId ?? ""} onChange={(e) => setGym(e.target.value)} className="h-10 max-w-[9rem] truncate appearance-none border-0 !bg-brand-royal text-sm font-semibold text-brand-yellow outline-none md:max-w-[14rem]">
        {!gymId && <option value="">{t("Välj plats", "Pick location")}</option>}
        {gyms.map((g) => <option key={g.id} value={g.id} className="text-foreground">{g.name}</option>)}
      </select>
    </label>
  );
}

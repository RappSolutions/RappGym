import { useState } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { todayISO } from "@/lib/gym";
import { CircuitRunner } from "@/components/gym/CircuitRunner";

/** Starts an empty workout today; exercises are added one by one while training. */
export function SpontaneousButton({ gymId, size = "default" }: { gymId: string; size?: "default" | "lg" }) {
  const { t } = useLanguage();
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    const { data, error } = await supabase.from("workouts").insert({ title: `${t("Spontanpass", "Spontaneous workout")} ${todayISO()}`, created_by: "user", scheduled_date: todayISO(), gym_id: gymId, is_circuit: true }).select("id").single();
    setBusy(false);
    if (error) { toast.error(t("Kunde inte starta passet.", "Could not start the workout.")); return; }
    setId(data.id);
  }
  return (
    <>
      <Button variant="secondary" size={size} className="w-full" disabled={busy} onClick={() => void start()}><Zap className="size-4" />{t("Spontanpass", "Spontaneous")}</Button>
      {id && <CircuitRunner workoutId={id} onClose={() => setId(null)} />}
    </>
  );
}

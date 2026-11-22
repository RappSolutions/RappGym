import { useUserView } from "@/lib/user-view";
import { useState } from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { todayISO } from "@/lib/gym";
import { useStartWorkout } from "@/components/gym/ActiveWorkout";

/** Starts an empty workout today; exercises are added one by one while training. */
export function SpontaneousButton({ gymId, size = "default" }: { gymId: string; size?: "default" | "lg" }) {
  const { t } = useLanguage();
  const { readOnly } = useUserView();
  const startWorkout = useStartWorkout();
  const [busy, setBusy] = useState(false);
  async function start() {
    if (readOnly) return;
    setBusy(true);
    const { data, error } = await supabase.from("workouts").insert({ title: `${t("spontaneousButton.spontaneousWorkout")} ${todayISO()}`, created_by: "user", scheduled_date: todayISO(), gym_id: gymId, is_circuit: true, is_spontaneous: true }).select("id").single();
    setBusy(false);
    if (error) { toast.error(t("spontaneousButton.couldNotStartTheWorkout")); return; }
    startWorkout(data.id);
  }
  return (
    <>
      <Button variant="secondary" size={size} className="w-full px-4" disabled={readOnly || busy} onClick={() => void start()}><Zap className="size-4" />{t("spontaneousButton.spontaneous")}</Button>
    </>
  );
}

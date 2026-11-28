import { Layers, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { ExerciseGrouping } from "@/lib/exercise-selection";

export function ExerciseGroupingSelect({ value, onChange }: { value: ExerciseGrouping; onChange: (value: ExerciseGrouping) => void }) {
  const { t } = useLanguage();
  return (
    <div role="radiogroup" aria-label={t("common.groupBy")} className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
      <Button type="button" role="radio" aria-checked={value === "category"} variant={value === "category" ? "secondary" : "ghost"} onClick={() => onChange("category")}><Layers />{t("common.category")}</Button>
      <Button type="button" role="radio" aria-checked={value === "equipment"} variant={value === "equipment" ? "secondary" : "ghost"} onClick={() => onChange("equipment")}><Dumbbell />{t("common.equipment")}</Button>
    </div>
  );
}
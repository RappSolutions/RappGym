import { EFFORT_LEVELS, type Effort } from "@/lib/effort";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** 5-step effort scale placed directly above the set's confirm button. */
export function EffortRuler({ value, onChange, disabled }: { value: Effort; onChange: (v: Effort) => void; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-1" role="radiogroup" aria-label={t("effort.label")}>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{t("effort.l1")}</span><span className="font-semibold text-foreground">{t(`effort.l${value}`)}</span><span>{t("effort.l5")}</span></div>
      <div className="grid grid-cols-5 gap-1">
        {EFFORT_LEVELS.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={v === value} aria-label={`${v} ${t(`effort.l${v}`)}`} disabled={disabled} onClick={() => onChange(v)}
            className={cn("h-8 rounded-sm border text-sm font-semibold transition-colors", v === value ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground")}>{v}</button>
        ))}
      </div>
    </div>
  );
}

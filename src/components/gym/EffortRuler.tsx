import { EFFORT_LEVELS, type Effort } from "@/lib/effort";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/** 5-step effort scale placed directly above the set's confirm button. */
export function EffortRuler({ value, onChange, disabled }: { value: Effort; onChange: (v: Effort) => void; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="effort-band grid grid-cols-5 rounded-md" role="radiogroup" aria-label={t("effort.label")}>
        {EFFORT_LEVELS.map((v) => (
          <Button key={v} variant="ghost" type="button" role="radio" aria-checked={v === value} aria-label={`${v} ${t(`effort.l${v}`)}`} title={t(`effort.l${v}`)} tabIndex={v === value ? 0 : -1} disabled={disabled} onClick={() => onChange(v)}
            onKeyDown={(event) => {
              const index = EFFORT_LEVELS.indexOf(v);
              const next = event.key === "Home" ? 1 : event.key === "End" ? 5
                : event.key === "ArrowRight" || event.key === "ArrowDown" ? EFFORT_LEVELS[(index + 1) % 5]
                : event.key === "ArrowLeft" || event.key === "ArrowUp" ? EFFORT_LEVELS[(index + 4) % 5] : undefined;
              if (next === undefined) return;
              event.preventDefault();
              onChange(next);
              const group = event.currentTarget.parentElement;
              const target = group?.querySelector<HTMLButtonElement>(`[role="radio"]:nth-child(${next})`);
              target?.focus();
            }}
            className={cn("effort-zone relative h-11 min-w-0 rounded-none p-0 first:rounded-l-md last:rounded-r-md", v === value && "effort-selected")}>
            {v === value && <Check aria-hidden className="effort-check" />}
          </Button>
        ))}
    </div>
  );
}

import { PHASES, type Phase } from "@/lib/circuit";
import { useLanguage } from "@/lib/i18n";

/** Compact phase picker for one planned row. */
export function PhaseSelect({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (p: Phase) => void }) {
  const { t } = useLanguage();
  return (
    <select aria-label={t("phase.phase")} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value as Phase)} className="h-8 shrink-0 rounded-md border border-input bg-background px-1 text-xs">
      {PHASES.map((p) => <option key={p} value={p}>{t(`phase.${p}`)}</option>)}
    </select>
  );
}

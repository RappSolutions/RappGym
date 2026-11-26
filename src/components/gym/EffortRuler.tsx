import { EFFORT_LEVELS, effortAtPosition, type Effort } from "@/lib/effort";
import { useRef, useState, type PointerEvent } from "react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Info } from "lucide-react";

/** 5-step effort scale placed directly above the set's confirm button. */
export function EffortRuler({ value, onChange, disabled }: { value: Effort; onChange: (v: Effort) => void; disabled?: boolean }) {
  const { t } = useLanguage();
  const [infoOpen, setInfoOpen] = useState(false);
  const dragging = useRef(false);
  const dragged = useRef(false);
  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    const next = effortAtPosition(event.clientX, r.left, r.width);
    if (next !== value) onChange(next);
  };
  return (
    <div className="flex items-center gap-2">
      <div className="effort-band grid min-w-0 flex-1 grid-cols-5 rounded-md" role="radiogroup" aria-label={t("effort.label")}
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => { if (disabled) return; dragging.current = true; dragged.current = false; e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (dragging.current) { dragged.current = true; pick(e); } }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; dragged.current = false; }}>
        {EFFORT_LEVELS.map((v) => (
          <Button key={v} variant="ghost" type="button" role="radio" aria-checked={v === value} aria-label={`${v} ${t(`effort.l${v}`)}`} title={t(`effort.l${v}`)} tabIndex={v === value ? 0 : -1} disabled={disabled} onClick={() => { if (dragged.current) { dragged.current = false; return; } onChange(v); }}
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
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={t("effort.infoButton")} title={t("effort.infoButton")} onClick={() => setInfoOpen(true)}><Info className="size-4" /></Button>
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle>{t("effort.infoTitle")}</DialogTitle>
            <DialogDescription>{t("effort.infoIntro")}</DialogDescription>
          </DialogHeader>
          <ol className="divide-y divide-border rounded-md border text-sm">
            {EFFORT_LEVELS.map((level) => <li key={level} className="grid grid-cols-[1.5rem_1fr] gap-x-2 px-3 py-2">
              <span className="row-span-2 font-bold tabular-nums">{level}</span>
              <span className="font-semibold">{t(`effort.l${level}`)}</span>
              <span className="text-muted-foreground">{t(`effort.d${level}`)}</span>
            </li>)}
          </ol>
          <p className="text-xs text-muted-foreground">{t("effort.humorNote")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

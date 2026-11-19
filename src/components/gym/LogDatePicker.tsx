import { useState } from "react";
import { format, parseISO } from "date-fns";
import { sv, enGB } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/lib/i18n";

export function LogDatePicker({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button id="log-date" variant="outline" className="h-12 w-full justify-between gap-2 px-3 font-normal" aria-label={`${t("common.date")}: ${value || placeholder || ""}`}><span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span><CalendarIcon className="size-4 shrink-0" /></Button></PopoverTrigger>
    <PopoverContent align="end" className="pointer-events-auto z-[60] w-auto p-0" data-vaul-no-drag>
      <Calendar mode="single" selected={date} defaultMonth={date ?? new Date()} locale={language === "sv" ? sv : enGB} weekStartsOn={1} autoFocus className="pointer-events-auto" onSelect={(selected) => { if (selected) { onChange(format(selected, "yyyy-MM-dd")); setOpen(false); } }} />
    </PopoverContent>
  </Popover>;
}
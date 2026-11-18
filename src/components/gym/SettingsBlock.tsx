import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/** Collapsible Settings card; every block starts collapsed. */
export function SettingsBlock({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border bg-card">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 p-4 text-left font-display text-2xl font-bold uppercase">
        {open ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}{title}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

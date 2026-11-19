import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgressOverview } from "@/components/gym/ProgressOverview";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { periodStart } from "@/lib/progress";
import {
  categoriesOf,
  categoryToken,
  computeStats,
  exercisesQuery,
  gymsQuery,
  logQuery,
  todayISO,
  useInvalidateGym,
} from "@/lib/gym";

function Bars({
  title,
  data,
  total,
  tokenOf,
}: {
  title: string;
  data: Map<string, number>;
  total: number;
  tokenOf?: (key: string) => string;
}) {
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-bold uppercase">{title}</h2>
      {[...data]
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => {
          const token = tokenOf?.(k);
          const theme: { "data-category"?: string; className?: string } = token
            ? { "data-category": token, className: "category-theme" }
            : {};
          return (
            <div key={k} {...theme}>
              <div className="flex justify-between text-sm">
                <span className={token ? "text-category-ink" : ""}>{k}</span>
                <span className="text-muted-foreground">
                  {v} · {Math.round((v / total) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 rounded bg-muted">
                <div
                  className={
                    token ? "h-2 rounded border border-category-ink bg-category-fill" : "h-2 rounded bg-primary"
                  }
                  style={{ width: `${(v / total) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
    </section>
  );
}

/** Collapsed statistics corner at the bottom of Home (replaces the former Statistics page). */
export function StatsCorner() {
  const { t, localize } = useLanguage();
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: allLog } = useSuspenseQuery(logQuery);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [period, setPeriod] = useState("all");
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateGym();
  const from = period === "all" ? null : periodStart(todayISO(), Number(period));
  const log = allLog.filter((e) => (!place || e.gym_id === place) && (!from || e.date >= from));
  const s = computeStats(log, exercises.map(localize));
  const categories = categoriesOf(exercises);

  async function importExcel() {
    setBusy(true);
    const history = (await import("@/data/history.json")).default;
    const { error } = await supabase
      .from("log_entries")
      .insert(history.map((h) => ({ ...h, gym_id: "00000000-0000-0000-0000-000000000001" })));
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(`${history.length} ${t("statsCorner.entriesImported")}`);
    invalidate();
  }

  return (
    <section className="space-y-4 border-t pt-3" aria-label={t("statsCorner.statistics")}>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-0"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <span className="inline-flex items-center gap-2 font-display text-xl font-bold">
          <BarChart3 className="size-5 text-primary" />
          {t("statsCorner.statistics")}
        </span>
      </Button>
      {open && (
        <>
          <div className="flex flex-wrap gap-2">
            {gyms.length > 0 && (
              <select
                aria-label={t("common.location")}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="h-11 w-full rounded-md border bg-background px-3 sm:w-auto"
              >
                <option value="">{t("common.allLocations")}</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label={t("statsCorner.period")}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 sm:w-auto"
            >
              <option value="all">{t("statsCorner.allTime")}</option>
              <option value="30">{t("statsCorner.last30Days")}</option>
              <option value="90">{t("statsCorner.last90Days")}</option>
              <option value="365">{t("statsCorner.lastYear")}</option>
            </select>
          </div>
          {s.totalSets > 0 && (
            <Bars
              title={t("statsCorner.setsByCategory")}
              data={s.perCat}
              total={s.totalSets}
              tokenOf={(k) => categoryToken(k, categories)}
            />
          )}
          {s.totalSets > 0 && (
            <Bars title={t("statsCorner.setsByEquipment")} data={s.perEq} total={s.totalSets} />
          )}
          {log.length === 0 && allLog.length > 0 && (
            <p className="text-muted-foreground">
              {t("statsCorner.noSetsLoggedForThis")}
            </p>
          )}
          {log.length > 0 && <ProgressOverview key={place + period} log={log} exercises={exercises} />}
          {allLog.length === 0 && (
            <Button variant="outline" onClick={importExcel} disabled={busy} className="w-full">
              {t("statsCorner.importExcelHistory")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

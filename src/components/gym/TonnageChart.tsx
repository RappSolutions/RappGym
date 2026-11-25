import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Segmented } from "@/components/gym/Segmented";
import { useLanguage } from "@/lib/i18n";
import type { LogEntry } from "@/lib/gym";
import { densityByWorkout, formatTonnage, tonnageByDay, tonnageByWeek } from "@/lib/tonnage";

type Mode = "day" | "week" | "density";

/** Primary Home statistic: tonnage per day / ISO week, or kg/min per workout. */
export function TonnageChart({ log }: { log: LogEntry[] }) {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<Mode>("day");
  const data: { x: string; v: number }[] =
    mode === "day" ? tonnageByDay(log).map((d) => ({ x: d.date, v: d.kg }))
    : mode === "week" ? tonnageByWeek(log).map((d) => ({ x: d.week, v: d.kg }))
    : densityByWorkout(log).map((d) => ({ x: d.date, v: d.kgPerMin }));
  const unit = mode === "density" ? "kg/min" : "kg";
  const fmt = (v: number) => (mode === "density" ? `${v.toLocaleString(language)} kg/min` : formatTonnage(v, language));
  const config = { v: { label: mode === "density" ? t("tonnageChart.density") : t("statsCorner.tonnage"), color: "var(--chart-1)" } };
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4" aria-labelledby="tonnage-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="tonnage-title" className="text-xl font-bold uppercase">{mode === "density" ? t("tonnageChart.densityTitle") : t("tonnageChart.title")}</h2>
        <Segmented value={mode} onChange={setMode} label={t("tonnageChart.view")} options={[{ value: "day", label: t("tonnageChart.day") }, { value: "week", label: t("tonnageChart.week") }, { value: "density", label: "kg/min" }]} />
      </div>
      {data.length === 0 ? <p className="py-4 text-sm text-muted-foreground">{t("tonnageChart.empty")}</p> : (
        <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-label={config.v.label}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="x" minTickGap={24} tickLine={false} axisLine={false} />
            <YAxis width={44} tickLine={false} axisLine={false} tickFormatter={(v: number) => (unit === "kg" && v >= 1000 ? `${(v / 1000).toLocaleString(language, { maximumFractionDigits: 1 })}t` : String(v))} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => String(p[0]?.payload.x)} formatter={(v) => fmt(Number(v))} />} />
            <Bar dataKey="v" fill="var(--color-v)" maxBarSize={36} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

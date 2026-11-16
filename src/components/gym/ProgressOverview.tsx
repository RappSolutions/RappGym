import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, formatDate, todayISO, type Exercise, type LogEntry } from "@/lib/gym";
import { periodStart, progressByDay, weightKg } from "@/lib/progress";
import { ProgressExercisePicker } from "@/components/gym/ProgressExercisePicker";

export function ProgressOverview({ log, exercises }: { log: LogEntry[]; exercises: Exercise[] }) {
  const { t, language, localize } = useLanguage();
  const loggedCodes = new Set(log.map((entry) => entry.code));
  const options = exercises.filter((exercise) => loggedCodes.has(exercise.code));
  const defaultCode = options.find((exercise) => log.some((entry) => entry.code === exercise.code && weightKg(entry.load) !== null))?.code;
  const [selection, setSelection] = useState<string | null>(null);
  const [period, setPeriod] = useState("all");
  const code = selection ?? defaultCode ?? "all";
  const categories = categoriesOf(exercises);
  const selected = code === "all" ? undefined : exercises.find((exercise) => exercise.code === code);
  const chartToken = selected ? categoryToken(selected.category, categories) : null;
  const data = progressByDay(log, code === "all" ? undefined : code, period === "all" ? undefined : periodStart(todayISO(), Number(period)));
  const weighted = data.filter((day) => day.weight !== null);
  const firstWeight = weighted[0]?.weight;
  const lastWeight = weighted.at(-1)?.weight;
  const weightChange = firstWeight != null && lastWeight != null && weighted.length > 1 ? lastWeight - firstWeight : null;
  const firstSets = data[0]?.sets;
  const lastSets = data.at(-1)?.sets;
  const setChange = firstSets !== undefined && lastSets !== undefined && data.length > 1 ? lastSets - firstSets : null;
  const number = (value: number) => value.toLocaleString(language === "sv" ? "sv-SE" : "en-GB");
  const delta = (value: number) => `${value > 0 ? "+" : ""}${number(value)}`;
  const shortDate = (date: string) => formatDate(date);
  const chartColor = (fallback: string) => (chartToken ? `var(--category-chart, ${fallback})` : fallback);
  const config = {
    weight: { label: t("Högsta vikt (kg)", "Heaviest weight (kg)"), color: chartColor("var(--chart-1)") },
    sets: { label: t("Antal set", "Sets"), color: chartColor("var(--chart-3)") },
  };

  return (
    <section className={`min-w-0 space-y-4 border-t pt-5${chartToken ? " category-theme" : ""}`} data-category={chartToken ?? undefined} aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-2xl font-bold uppercase">{t("Utveckling över tid", "Progress over time")}</h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <div className="min-w-0 space-y-1">
          <label htmlFor="progress-exercise" className="text-xs uppercase text-muted-foreground">{t("Övning", "Exercise")}</label>
          <ProgressExercisePicker exercises={exercises} loggedCodes={loggedCodes} value={code} onChange={setSelection} />
        </div>
        <div className="space-y-1">
          <label htmlFor="progress-period" className="text-xs uppercase text-muted-foreground">{t("Period", "Period")}</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger id="progress-period" className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Hela historiken", "All time")}</SelectItem>
              <SelectItem value="30">{t("Senaste 30 dagarna", "Last 30 days")}</SelectItem>
              <SelectItem value="90">{t("Senaste 90 dagarna", "Last 90 days")}</SelectItem>
              <SelectItem value="365">{t("Senaste året", "Last year")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {!data.length ? <p className="py-6 text-muted-foreground">{t("Inga loggade set under perioden.", "No sets logged in this period.")}</p> : (
        <>
          {code !== "all" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-bold">{t("Högsta vikt per pass", "Heaviest weight per workout")}</h3>
                {lastWeight != null && <div className="text-sm"><b className="text-primary">{number(lastWeight)} kg</b>{weightChange !== null && <span className="text-muted-foreground"> · {delta(weightChange)} kg {t("sedan första passet", "since first workout")}</span>}</div>}
              </div>
              {weighted.length ? (
                <ChartContainer config={config} className="h-52 w-full aspect-auto" aria-label={t("Viktutveckling i kilogram", "Weight progress in kilograms")}>
                  <LineChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={30} tickLine={false} axisLine={false} />
                    <YAxis width={40} tickLine={false} axisLine={false} domain={[0, "auto"]} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatDate(String(payload[0]?.payload.date))} />} />
                    <Line dataKey="weight" type="linear" stroke="var(--color-weight)" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ChartContainer>
              ) : <p className="py-4 text-sm text-muted-foreground">{t("Ingen numerisk vikt loggad under perioden.", "No numeric weight logged in this period.")}</p>}
              <p className="text-xs text-muted-foreground">{t("Numeriska belastningar räknas som kg. Band, kroppsvikt och andra textvärden ingår inte.", "Numeric loads are treated as kg. Bands, bodyweight and other text values are excluded.")}</p>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold">{t("Antal set per pass", "Sets per workout")}</h3>
              <div className="text-sm"><b className="text-chart-3">{lastSets} {t("set senast", "sets last workout")}</b>{setChange !== null && <span className="text-muted-foreground"> · {delta(setChange)} {t("sedan första passet", "since first workout")}</span>}</div>
            </div>
            <ChartContainer config={config} className="h-52 w-full aspect-auto" aria-label={t("Setutveckling per pass", "Sets per workout over time")}>
              <BarChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={30} tickLine={false} axisLine={false} />
                <YAxis width={40} allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatDate(String(payload[0]?.payload.date))} />} />
                    <Bar dataKey="sets" fill="var(--color-sets)" maxBarSize={40} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </div>
          <details className="border-b pb-3">
            <summary className="cursor-pointer text-sm font-semibold">{t("Pass i perioden", "Workouts in period")} · {data.length} · {data.reduce((sum, day) => sum + day.sets, 0)} {t("set totalt", "total sets")}</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2">{t("Datum", "Date")}</th>{code !== "all" && <th className="text-right">{t("Högsta kg", "Max kg")}</th>}<th className="text-right">{t("Set", "Sets")}</th></tr></thead>
              <tbody>{data.map((day) => <tr key={day.date} className="border-t"><td className="py-2">{formatDate(day.date)}</td>{code !== "all" && <td className="text-right tabular-nums">{day.weight === null ? "–" : number(day.weight)}</td>}<td className="text-right tabular-nums">{day.sets}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
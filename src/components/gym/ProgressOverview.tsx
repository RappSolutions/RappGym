import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, formatDate, type Exercise, type LogEntry } from "@/lib/gym";
import { progressByDay, weightKg } from "@/lib/progress";
import { ProgressExercisePicker } from "@/components/gym/ProgressExercisePicker";

export function ProgressOverview({ log, exercises, fixedExercise }: { log: LogEntry[]; exercises: Exercise[]; fixedExercise?: Exercise }) {
  const { t, language, localize } = useLanguage();
  const loggedCodes = new Set(log.map((entry) => entry.code));
  const options = exercises.filter((exercise) => loggedCodes.has(exercise.code));
  const defaultCode = options.find((exercise) => log.some((entry) => entry.code === exercise.code && weightKg(entry.load) !== null))?.code;
  const [selection, setSelection] = useState<string | null>(null);
  const code = fixedExercise?.code ?? selection ?? defaultCode ?? "all";
  const categories = categoriesOf(exercises);
  const selected = code === "all" ? undefined : exercises.find((exercise) => exercise.code === code);
  const chartToken = selected ? categoryToken(selected.category, categories) : null;
  const data = progressByDay(log, code === "all" ? undefined : code, undefined);
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
    weight: { label: t("progressOverview.heaviestWeightKg"), color: chartColor("var(--chart-1)") },
    sets: { label: t("common.sets2"), color: chartColor("var(--chart-3)") },
  };

  return (
    <section className={`min-w-0 space-y-4 border-t pt-5${chartToken ? " category-theme" : ""}`} data-category={chartToken ?? undefined} aria-labelledby="progress-title">
      <h2 id="progress-title" className="text-2xl font-bold uppercase">{t("progressOverview.progressOverTime")}</h2>
      {!fixedExercise && <div className="grid min-w-0 gap-3 ">
        <div className="min-w-0 space-y-1">
          <label htmlFor="progress-exercise" className="text-xs uppercase text-muted-foreground">{t("progressOverview.exercise")}</label>
          <ProgressExercisePicker exercises={exercises} loggedCodes={loggedCodes} value={code} onChange={setSelection} />
        </div>
      </div>}
      {!data.length ? <p className="py-6 text-muted-foreground">{t("progressOverview.noSetsLoggedInThis")}</p> : (
        <>
          {code !== "all" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-bold">{t("progressOverview.heaviestWeightPerWorkout")}</h3>
                {lastWeight != null && <div className="text-sm"><b className="text-primary">{number(lastWeight)} kg</b>{weightChange !== null && <span className="text-muted-foreground"> · {delta(weightChange)} kg {t("progressOverview.sinceFirstWorkout")}</span>}</div>}
              </div>
              {weighted.length ? (
                <ChartContainer config={config} className="h-52 w-full aspect-auto" aria-label={t("progressOverview.weightProgressInKilograms")}>
                  <LineChart data={data} margin={{ left: 0, right: 12, top: 12, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={30} tickLine={false} axisLine={false} />
                    <YAxis width={40} tickLine={false} axisLine={false} domain={[0, "auto"]} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => formatDate(String(payload[0]?.payload.date))} />} />
                    <Line dataKey="weight" type="linear" stroke="var(--color-weight)" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ChartContainer>
              ) : <p className="py-4 text-sm text-muted-foreground">{t("progressOverview.noNumericWeightLoggedIn")}</p>}
              <p className="text-xs text-muted-foreground">{t("progressOverview.numericLoadsAreTreatedAs")}</p>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold">{t("progressOverview.setsPerWorkout")}</h3>
              <div className="text-sm"><b className="text-chart-3">{lastSets} {t("progressOverview.setsLastWorkout")}</b>{setChange !== null && <span className="text-muted-foreground"> · {delta(setChange)} {t("progressOverview.sinceFirstWorkout")}</span>}</div>
            </div>
            <ChartContainer config={config} className="h-52 w-full aspect-auto" aria-label={t("progressOverview.setsPerWorkoutOverTime")}>
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
            <summary className="cursor-pointer text-sm font-semibold">{t("progressOverview.workoutsInPeriod")} · {data.length} · {data.reduce((sum, day) => sum + day.sets, 0)} {t("progressOverview.totalSets")}</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-muted-foreground"><tr><th className="py-2">{t("common.date")}</th>{code !== "all" && <th className="text-right">{t("progressOverview.maxKg")}</th>}<th className="text-right">{t("progressOverview.sets")}</th></tr></thead>
              <tbody>{data.map((day) => <tr key={day.date} className="border-t"><td className="py-2">{formatDate(day.date)}</td>{code !== "all" && <td className="text-right tabular-nums">{day.weight === null ? "–" : number(day.weight)}</td>}<td className="text-right tabular-nums">{day.sets}</td></tr>)}</tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
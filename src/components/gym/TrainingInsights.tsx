import { useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, LoaderCircle, Send, CalendarPlus, Check, RotateCcw } from "lucide-react";
import { estimateUsage, formatAiCost } from "@/lib/ai-cost";
import { supabase } from "@/integrations/supabase/client";
import { analysisDateTime, suggestionRows } from "@/lib/workout-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, getSelectedGym, todayISO } from "@/lib/gym";
import {
  planStartDate,
  plannedWorkoutDate,
  trainingRequestSchema,
  trainingResultSections,
} from "@/lib/training-request";
import { getTrainingInsights } from "@/lib/training-insights.functions";
import type { Exercise } from "@/lib/gym";
import type { TrainingInsights as Insights } from "@/lib/training-insights-schema";
import { aiHistoryQuery, acceptedAiQuery, unacceptedWorkoutKeys } from "@/lib/ai-history";
import { useSelectedGym } from "@/hooks/use-gym";
import { gymsQuery } from "@/lib/gym";
import { LogDatePicker } from "./LogDatePicker";

type TrainingInsightsProps = {
  exercises: Exercise[];
  hasLog: boolean;
  initialMode?: "summary" | "plan";
};

export function TrainingInsights(props: TrainingInsightsProps) {
  const { exercises, hasLog } = props;
  const { t, language, localize } = useLanguage();
  const queryClient = useQueryClient();
  const generate = useServerFn(getTrainingInsights);
  const { data: history } = useSuspenseQuery(aiHistoryQuery);
  const { data: accepted } = useSuspenseQuery(acceptedAiQuery);
  const [gymId] = useSelectedGym();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const id = useId();
  const [mode, setMode] = useState<"summary" | "plan">(props.initialMode ?? "summary");
  const [question, setQuestion] = useState("");
  const [workoutCount, setWorkoutCount] = useState("");
  const [periodDays, setPeriodDays] = useState("");
  const [purpose, setPurpose] = useState("");
  const [minutes, setMinutes] = useState("");
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [planGym, setPlanGym] = useState<string | null | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const requestGym = mode === "plan" && planGym !== undefined ? planGym : gymId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    insights: Insights;
    generatedAt: string;
    language: string;
    gymId: string | null;
    today: string;
    question: string;
    request: ReturnType<typeof trainingRequestSchema.parse>;
  } | null>(null);

  async function analyze() {
    const parsed = trainingRequestSchema.safeParse({
      mode,
      question: mode === "plan" ? "" : question,
      workoutCount: workoutCount ? Number(workoutCount) : null,
      periodDays: periodDays ? Number(periodDays) : null,
      sessionMinutes: mode === "plan" && minutes ? Number(minutes) : null,
      purpose,
      startDate: mode === "plan" && startDate ? startDate : null,
    });
    if (!parsed.success) {
      setError(
        t(
          "Kontrollera antal pass och dagar: högst ett pass per dag, 1–14 pass, 1–90 dagar och 5–240 minuter per pass.",
          "Check workouts and days: at most one workout per day, 1–14 workouts, 1–90 days and 5–240 minutes per workout.",
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const gymId = mode === "plan" ? requestGym : getSelectedGym();
      const today = todayISO();
      const request = parsed.data;
      const response = await generate({ data: { language, gymId, today, request } });
      if (response.insights && response.generatedAt) {
        const next = {
          id: response.historyId ?? crypto.randomUUID(),
          insights: response.insights,
          generatedAt: response.generatedAt,
          language,
          gymId,
          today,
          question: request.question,
          request,
        };
        setResult(next);
        setSelectedId(next.id);
        setError(response.error);
        setSaved(new Set());
        await queryClient.invalidateQueries({ queryKey: ["ai-history"] });
        queryClient.setQueryData(["training-insights", language, gymId, request], next);
      } else setError(response.error);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("Analysen misslyckades", "Analysis failed"));
    } finally {
      setBusy(false);
    }
  }

  function reuseRequest(r: ReturnType<typeof trainingRequestSchema.parse>, gym: string | null) {
    if (r.mode === "plan") setPlanGym(gym);
    setMode(r.mode === "plan" ? "plan" : "summary");
    setQuestion(r.question ?? "");
    setWorkoutCount(r.workoutCount ? String(r.workoutCount) : "");
    setPeriodDays(r.periodDays ? String(r.periodDays) : "");
    setPurpose(r.purpose ?? "");
    setMinutes(r.sessionMinutes ? String(r.sessionMinutes) : "");
    setStartDate("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const scopedHistory = history.filter((row) => row.request.mode === mode);
  const current =
    scopedHistory.find((row) => row.id === selectedId) ??
    (result?.id === selectedId && result.request.mode === mode ? result : null);
  const sections = trainingResultSections(mode);
  const acceptedKeys = new Set(
    accepted.filter((row) => row.ai_history_id === current?.id).map((row) => row.ai_workout_key ?? ""),
  );
  for (const key of saved) if (key.startsWith(`${current?.id}:`)) acceptedKeys.add(key.slice(key.indexOf(":") + 1));
  const workouts = current
    ? current.insights.workouts.length
      ? current.insights.workouts.map((workout, index) => ({ ...workout, key: String(index) }))
      : [{ exercises: current.insights.exercises, dayOffset: 0, title: t("Nästa pass", "Next workout"), key: "next" }]
    : [];
  const pending = unacceptedWorkoutKeys(
    workouts.filter((workout) => workout.exercises.length).map((workout) => workout.key),
    acceptedKeys,
  );
  async function saveWorkouts(keys: string[]) {
    if (!current || !sections.plan || saving || !keys.length) return;
    setSaving(keys.length > 1 ? "all" : (keys[0] ?? "all"));
    setError(null);
    try {
      let historyId = current.id;
      if (!history.some((row) => row.id === historyId)) {
        const { data, error } = await supabase
          .from("training_ai_history")
          .insert({
            language: current.language,
            gym_id: current.gymId,
            today: current.today,
            request: current.request,
            insights: current.insights,
            generated_at: current.generatedAt,
          })
          .select("id")
          .single();
        if (error) throw error;
        historyId = data.id;
        setSelectedId(historyId);
      }
      for (const workout of workouts.filter((item) => keys.includes(item.key) && !acceptedKeys.has(item.key))) {
        const date = plannedWorkoutDate(planStartDate(current.request, current.today), workout.dayOffset);
        const head = await supabase
          .from("workouts")
          .insert({
            title: workout.title,
            created_by: "ai",
            scheduled_date: date,
            gym_id: current.gymId,
            ai_history_id: historyId,
            ai_workout_key: workout.key,
            is_circuit: true,
          })
          .select("id")
          .single();
        if (head.error) {
          if (head.error.code === "23505") continue;
          throw head.error;
        }
        const { error } = await supabase
          .from("log_entries")
          .insert(
            suggestionRows(
              workout.exercises,
              planStartDate(current.request, current.today),
              workout.dayOffset,
              current.gymId,
              head.data.id,
            ),
          );
        if (error) throw error;
      }

      setSaved((previous) => new Set([...previous, ...keys.map((key) => `${historyId}:${key}`)]));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }),
        queryClient.invalidateQueries({ queryKey: ["accepted-ai-workouts"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-history"] }),
      ]);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("Passet kunde inte sparas", "Could not save workout"));
    } finally {
      setSaving(null);
    }
  }
  function saveControl(items: Insights["exercises"], offset: number, title: string, key: string) {
    return (
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || saving !== null || acceptedKeys.has(key) || !items.length}
          onClick={() => void saveWorkouts([key])}
        >
          {saving === key ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : acceptedKeys.has(key) ? (
            <Check className="size-4" />
          ) : (
            <CalendarPlus className="size-4" />
          )}
          {acceptedKeys.has(key)
            ? t("Passet accepterat som förslag", "Workout accepted as suggestion")
            : t("Acceptera passet som förslag", "Accept workout as suggestion")}
        </Button>
        {acceptedKeys.has(key) && (
          <span className="text-sm text-muted-foreground">{t("Finns under Pass", "Listed under Workouts")}</span>
        )}
      </div>
    );
  }
  const categories = categoriesOf(exercises);
  function suggestions(items: Insights["exercises"]) {
    return (
      <ul className="divide-y divide-border">
        {items.map((suggestion, index) => {
          const exercise = exercises.find((exercise) => exercise.code === suggestion.code);
          if (!exercise) return null;
          return (
            <li
              key={`${suggestion.code}-${index}`}
              data-category={categoryToken(exercise.category, categories)}
              className="category-theme my-2 border-l-4 border-category-fill py-2 pl-3"
            >
              <Link
                to="/exercises/$code"
                params={{ code: suggestion.code }}
                className="font-semibold text-category-ink underline-offset-4 hover:underline"
              >
                {suggestion.code} · {localize(exercise).name}
              </Link>
              <p className="text-sm font-medium">
                {suggestion.sets} × {suggestion.reps} {t("reps", "reps")}
                {suggestion.load ? ` @ ${suggestion.load}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{suggestion.reason}</p>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <section
      className="space-y-4 border-t border-border pt-5"
      aria-label={t("AI - råd och planering", "AI - advice and strategy")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="size-5 text-primary" />
          {t("AI - råd och planering", "AI - advice and strategy")}
        </h2>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) void analyze();
        }}
      >
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
          role="group"
          aria-label={t("Typ av AI-förslag", "AI request type")}
        >
          {(
            [
              ["summary", t("Analys & frågor", "Analysis & questions")],
              ["plan", t("Planera pass", "Plan workouts")],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              disabled={busy}
              onClick={() => {
                setMode(m);
                setSelectedId(null);
              }}
              className={`h-11 rounded-lg text-sm font-semibold transition-colors ${mode === m ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "summary" && (
          <div className="space-y-1">
            <label htmlFor={`${id}-question`} className="text-sm font-medium">
              {t("Din fråga eller önskemål", "Your question or request")}
            </label>
            <Textarea
              id={`${id}-question`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={2000}
              disabled={busy}
              placeholder={t("Vad borde jag prioritera i min träning?", "What should I prioritize in my training?")}
              className="min-h-24"
            />
          </div>
        )}
        {mode === "plan" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]">
            <div className="space-y-1">
              <label htmlFor={`${id}-count`} className="text-sm font-medium">
                {t("Antal pass", "Workouts")}
              </label>
              <Input
                id={`${id}-count`}
                type="number"
                min={1}
                max={14}
                step={1}
                placeholder="4"
                value={workoutCount}
                disabled={busy}
                onChange={(event) => setWorkoutCount(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-days`} className="text-sm font-medium">
                {t("Antal dagar", "Days")}
              </label>
              <Input
                id={`${id}-days`}
                type="number"
                min={1}
                max={90}
                step={1}
                placeholder="7"
                value={periodDays}
                disabled={busy}
                onChange={(event) => setPeriodDays(event.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <label htmlFor={`${id}-purpose`} className="text-sm font-medium">
                {t("Syfte", "Purpose")}
              </label>
              <Input
                id={`${id}-purpose`}
                value={purpose}
                maxLength={300}
                disabled={busy}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder={t("T.ex. skidåkning, styrka eller variation", "E.g. skiing, strength or variety")}
              />
            </div>
          </div>
        )}
        {mode === "plan" && (
          <div className="space-y-1">
            <label htmlFor={`${id}-minutes`} className="text-sm font-medium">
              {t("Ungefärlig längd per pass (min)", "Approximate length per workout (min)")}
            </label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 75, 90].map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={minutes === String(m) ? "default" : "outline"}
                  aria-pressed={minutes === String(m)}
                  disabled={busy}
                  onClick={() => setMinutes(minutes === String(m) ? "" : String(m))}
                >
                  {m}
                </Button>
              ))}
              <Input
                id={`${id}-minutes`}
                type="number"
                min={5}
                max={240}
                step={5}
                placeholder={t("Annat", "Other")}
                value={minutes}
                disabled={busy}
                onChange={(event) => setMinutes(event.target.value)}
                className="h-9 w-24"
              />
            </div>
          </div>
        )}
        {mode === "plan" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={`${id}-gym`} className="text-sm font-medium">
                {t("Plats", "Location")}
              </label>
              <select
                id={`${id}-gym`}
                className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={requestGym ?? ""}
                disabled={busy}
                onChange={(event) => setPlanGym(event.target.value || null)}
              >
                <option value="">{t("Ingen särskild plats", "No specific location")}</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="log-date" className="text-sm font-medium">
                {t("Startdatum", "Start date")}
              </label>
              <LogDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder={t(`Idag (${todayISO()})`, `Today (${todayISO()})`)}
              />
            </div>
          </div>
        )}
        {mode === "plan" && (
          <p className="text-sm text-muted-foreground">
            {t(
              "Antal pass och dagar är valfria — tomt ger 4 pass under 7 dagar. Din profilens ålder, längd, vikt och tempo används.",
              "Workouts and days are optional — empty means 4 workouts over 7 days. Your profile's age, length, weight, and pace are used.",
            )}
          </p>
        )}
        <Button type="submit" disabled={busy || !hasLog} className="w-full sm:w-auto">
          {busy ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="size-4" />
          )}
          {busy
            ? t("Tänker…", "Thinking…")
            : mode === "plan"
              ? t("Ge mig passförslag", "Suggest workouts")
              : question.trim()
                ? t("Fråga om min träning", "Ask about my training")
                : current
                  ? t("Uppdatera analys", "Update analysis")
                  : t("Analysera mina pass", "Analyze my workouts")}
        </Button>
        {(() => {
          const e = estimateUsage(
            mode,
            history.map((h) => ({ mode: h.request.mode, inputTokens: h.inputTokens, outputTokens: h.outputTokens })),
          );
          return (
            <p className="text-xs text-muted-foreground">
              {t("Uppskattad kostnad", "Estimated cost")}: {formatAiCost(e.input, e.output, language, true)}
            </p>
          );
        })()}
      </form>
      {scopedHistory.length > 0 && (
        <div className="space-y-1">
          <label htmlFor={`${id}-history`} className="text-sm font-semibold">
            {t("AI-historik", "AI history")}
          </label>
          <select
            id={`${id}-history`}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={current?.id ?? ""}
            disabled={busy || saving !== null}
            onChange={(event) => setSelectedId(event.target.value || null)}
          >
            <option value="">{t("Välj tidigare svar…", "Pick a previous answer…")}</option>
            {scopedHistory.map((row) => (
              <option key={row.id} value={row.id}>
                {analysisDateTime(row.generatedAt)}
                {row.gymId ? ` · ${gyms.find((g) => g.id === row.gymId)?.name ?? ""}` : ""}
                {row.request.purpose || row.question ? ` · ${(row.request.purpose || row.question).slice(0, 70)}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {!hasLog && (
        <p className="text-sm text-muted-foreground">{t("Inga träningsloggar ännu.", "No workouts logged yet.")}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div aria-live="polite" aria-busy={busy}>
        {current && !busy && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {sections.plan ? t("Planerad", "Planned") : t("Analyserad", "Analyzed")}{" "}
                {analysisDateTime(current.generatedAt)}
                {(() => {
                  const u = history.find((h) => h.id === current.id);
                  return u && u.inputTokens != null && u.outputTokens != null
                    ? ` · ${formatAiCost(u.inputTokens, u.outputTokens, language)}`
                    : "";
                })()}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => reuseRequest(current.request, current.gymId)}
              >
                <RotateCcw className="size-4" />
                {t("Fråga samma igen", "Ask the same again")}
              </Button>
            </div>
            {sections.analysis && (
              <>
                {current.question && (
                  <p className="break-words border-l-4 border-brand-yellow pl-3 text-sm">{current.question}</p>
                )}
                {current.insights.answer && (
                  <p className="whitespace-pre-line leading-relaxed">{current.insights.answer}</p>
                )}
                <p className="leading-relaxed">{current.insights.summary}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="font-bold">{t("Viktutveckling", "Weight development")}</h3>
                    <p className="mt-1 text-sm leading-relaxed">{current.insights.weightDevelopment}</p>
                  </div>
                  <div>
                    <h3 className="font-bold">{t("Utveckling i set", "Set development")}</h3>
                    <p className="mt-1 text-sm leading-relaxed">{current.insights.setDevelopment}</p>
                  </div>
                </div>
              </>
            )}
            {sections.plan && (
              <>
                <h3 className="text-xl font-bold">
                  {current.insights.workouts.length
                    ? t("Din träningsplan", "Your workout plan")
                    : t("Förslag på nästa pass", "Suggested next workout")}
                </h3>
                {current.insights.workouts.length > 0 && (
                  <Button
                    type="button"
                    disabled={busy || saving !== null || pending.length === 0}
                    onClick={() => void saveWorkouts(pending)}
                  >
                    {saving === "all" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : pending.length === 0 ? (
                      <Check className="size-4" />
                    ) : (
                      <CalendarPlus className="size-4" />
                    )}
                    {pending.length === 0
                      ? t("Alla pass accepterade som förslag", "All workouts accepted as suggestions")
                      : t("Acceptera alla pass som förslag", "Accept all workouts as suggestions")}
                  </Button>
                )}
                <p className="text-sm leading-relaxed">{current.insights.recommendation}</p>
                {current.insights.goalNotes && (
                  <p className="rounded-lg border-l-4 border-brand-yellow bg-muted p-3 text-sm leading-relaxed">
                    <strong>{t("Dina mål", "Your goals")}: </strong>
                    {current.insights.goalNotes}
                  </p>
                )}
                {current.insights.workouts.length ? (
                  <div className="divide-y divide-border">
                    {current.insights.workouts.map((workout, index) => (
                      <article
                        key={workout.dayOffset}
                        className="py-4"
                        aria-label={`${t("Pass", "Workout")} ${index + 1}`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h4 className="text-xl font-bold">
                            {index + 1}. {workout.title}
                          </h4>
                          <span className="text-sm font-medium text-muted-foreground">
                            {plannedWorkoutDate(planStartDate(current.request, current.today), workout.dayOffset)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">{workout.focus}</p>
                        {suggestions(workout.exercises)}
                        {saveControl(workout.exercises, workout.dayOffset, workout.title, String(index))}
                      </article>
                    ))}
                  </div>
                ) : (
                  <>
                    {suggestions(current.insights.exercises)}
                    {saveControl(current.insights.exercises, 0, t("Nästa pass", "Next workout"), "next")}
                  </>
                )}
              </>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">{current.insights.caution}</p>
          </div>
        )}
      </div>
    </section>
  );
}

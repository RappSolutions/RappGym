import { useId, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import { categoriesOf, categoryToken, getSelectedGym, todayISO } from "@/lib/gym";
import { plannedWorkoutDate, trainingRequestSchema } from "@/lib/training-request";
import { getTrainingInsights } from "@/lib/training-insights.functions";
import type { Exercise } from "@/lib/gym";
import type { TrainingInsights as Insights } from "@/lib/training-insights-schema";

export function TrainingInsights({ exercises, hasLog }: { exercises: Exercise[]; hasLog: boolean }) {
  const { t, language, localize } = useLanguage();
  const queryClient = useQueryClient();
  const generate = useServerFn(getTrainingInsights);
  const id = useId();
  const [mode, setMode] = useState<"summary" | "plan">("summary");
  const [question, setQuestion] = useState("");
  const [workoutCount, setWorkoutCount] = useState("");
  const [periodDays, setPeriodDays] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ insights: Insights; generatedAt: string; language: string; gymId: string | null; today: string; question: string } | null>(null);

  async function analyze() {
    const parsed = trainingRequestSchema.safeParse({ mode, question: mode === "plan" ? "" : question, workoutCount: workoutCount ? Number(workoutCount) : null, periodDays: periodDays ? Number(periodDays) : null, purpose });
    if (!parsed.success) {
      setError(t("Kontrollera antal pass och dagar: högst ett pass per dag, 1–14 pass och 1–90 dagar.", "Check workouts and days: at most one workout per day, 1–14 workouts and 1–90 days."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const gymId = getSelectedGym();
      const today = todayISO();
      const request = parsed.data;
      const response = await generate({ data: { language, gymId, today, request } });
      if (response.insights && response.generatedAt) {
        const next = { insights: response.insights, generatedAt: response.generatedAt, language, gymId, today, question: request.question };
        setResult(next);
        queryClient.setQueryData(["training-insights", language, gymId, request], next);
      } else setError(response.error);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("Analysen misslyckades", "Analysis failed"));
    } finally { setBusy(false); }
  }

  const current = result?.language === language && result.gymId === getSelectedGym() ? result : null;
  const categories = categoriesOf(exercises);
  function suggestions(items: Insights["exercises"]) {
    return <ul className="divide-y divide-border">{items.map((suggestion, index) => {
      const exercise = exercises.find((exercise) => exercise.code === suggestion.code);
      if (!exercise) return null;
      return <li key={`${suggestion.code}-${index}`} data-category={categoryToken(exercise.category, categories)} className="category-theme my-2 border-l-4 border-category-fill py-2 pl-3">
        <Link to="/exercises/$code" params={{ code: suggestion.code }} className="font-semibold text-category-ink underline-offset-4 hover:underline">{suggestion.code} · {localize(exercise).name}</Link>
        <p className="text-sm font-medium">{suggestion.sets} × {suggestion.reps} {t("reps", "reps")}{suggestion.load ? ` @ ${suggestion.load}` : ""}</p>
        <p className="mt-1 text-sm text-muted-foreground">{suggestion.reason}</p>
      </li>;
    })}</ul>;
  }
  return <section className="space-y-4 border-t border-border pt-5" aria-label={t("AI-sammanfattning", "AI summary")}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="size-5 text-primary" />{t("AI-sammanfattning", "AI summary")}</h2>
    </div>
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!busy) void analyze(); }}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("Typ av AI-förslag", "AI request type")}>
        <Button type="button" size="sm" variant={mode === "summary" ? "default" : "outline"} aria-pressed={mode === "summary"} disabled={busy} onClick={() => setMode("summary")}>{t("Analys & frågor", "Analysis & questions")}</Button>
        <Button type="button" size="sm" variant={mode === "plan" ? "default" : "outline"} aria-pressed={mode === "plan"} disabled={busy} onClick={() => setMode("plan")}>{t("Planera pass", "Plan workouts")}</Button>
      </div>
      {mode === "summary" && <div className="space-y-1">
        <label htmlFor={`${id}-question`} className="text-sm font-medium">{t("Din fråga eller önskemål", "Your question or request")}</label>
        <Textarea id={`${id}-question`} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} disabled={busy} placeholder={t("Vad borde jag prioritera i min träning?", "What should I prioritize in my training?")} className="min-h-24" />
      </div>}
      {mode === "plan" && <div className="grid grid-cols-2 gap-3 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]">
        <div className="space-y-1"><label htmlFor={`${id}-count`} className="text-sm font-medium">{t("Antal pass", "Workouts")}</label><Input id={`${id}-count`} type="number" min={1} max={14} step={1} placeholder="4" value={workoutCount} disabled={busy} onChange={(event) => setWorkoutCount(event.target.value)} /></div>
        <div className="space-y-1"><label htmlFor={`${id}-days`} className="text-sm font-medium">{t("Antal dagar", "Days")}</label><Input id={`${id}-days`} type="number" min={1} max={90} step={1} placeholder="7" value={periodDays} disabled={busy} onChange={(event) => setPeriodDays(event.target.value)} /></div>
        <div className="col-span-2 space-y-1 sm:col-span-1"><label htmlFor={`${id}-purpose`} className="text-sm font-medium">{t("Syfte", "Purpose")}</label><Input id={`${id}-purpose`} value={purpose} maxLength={300} disabled={busy} onChange={(event) => setPurpose(event.target.value)} placeholder={t("T.ex. skidåkning, styrka eller variation", "E.g. skiing, strength or variety")} /></div>
      </div>}
      {mode === "plan" && <p className="text-sm text-muted-foreground">{t("Antal pass och dagar är valfria — tomt ger 4 pass under 7 dagar.", "Workouts and days are optional — empty means 4 workouts over 7 days.")}</p>}
      <Button type="submit" disabled={busy || !hasLog} className="w-full sm:w-auto">
        {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}
        {busy ? t("Tänker…", "Thinking…") : mode === "plan" ? t("Ge mig passförslag", "Suggest workouts") : question.trim() ? t("Fråga om min träning", "Ask about my training") : current ? t("Uppdatera analys", "Update analysis") : t("Analysera mina pass", "Analyze my workouts")}
      </Button>
    </form>
    {!hasLog && <p className="text-sm text-muted-foreground">{t("Inga träningsloggar ännu.", "No workouts logged yet.")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div aria-live="polite" aria-busy={busy}>
      {current && <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("Analyserad", "Analyzed")} {current.generatedAt.slice(0, 10)}</p>
        {current.question && <p className="break-words border-l-4 border-brand-yellow pl-3 text-sm">{current.question}</p>}
        {current.insights.answer && <p className="whitespace-pre-line leading-relaxed">{current.insights.answer}</p>}
        <p className="leading-relaxed">{current.insights.summary}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h3 className="font-bold">{t("Viktutveckling", "Weight development")}</h3><p className="mt-1 text-sm leading-relaxed">{current.insights.weightDevelopment}</p></div>
          <div><h3 className="font-bold">{t("Utveckling i set", "Set development")}</h3><p className="mt-1 text-sm leading-relaxed">{current.insights.setDevelopment}</p></div>
        </div>
        <h3 className="text-xl font-bold">{current.insights.workouts.length ? t("Din träningsplan", "Your workout plan") : t("Förslag på nästa pass", "Suggested next workout")}</h3>
        <p className="text-sm leading-relaxed">{current.insights.recommendation}</p>
        {current.insights.goalNotes && <p className="rounded-lg border-l-4 border-brand-yellow bg-muted p-3 text-sm leading-relaxed"><strong>{t("Dina mål", "Your goals")}: </strong>{current.insights.goalNotes}</p>}
        {current.insights.workouts.length ? <div className="divide-y divide-border">{current.insights.workouts.map((workout, index) => <article key={workout.dayOffset} className="py-4" aria-label={`${t("Pass", "Workout")} ${index + 1}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-xl font-bold">{index + 1}. {workout.title}</h4><span className="text-sm font-medium text-muted-foreground">{plannedWorkoutDate(current.today, workout.dayOffset)}</span></div>
          <p className="mt-1 text-sm leading-relaxed">{workout.focus}</p>
          {suggestions(workout.exercises)}
        </article>)}</div> : suggestions(current.insights.exercises)}
        <p className="text-xs leading-relaxed text-muted-foreground">{current.insights.caution}</p>
      </div>}
    </div>
  </section>;
}
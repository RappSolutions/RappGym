import { useUserView } from "@/lib/user-view";
import { useEffect, useId, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { SupporterLink } from "@/components/gym/SupporterLink";
import { getMyAiQuota } from "@/lib/ai-quota.functions";
import { quotaAllowed, quotaRemaining } from "@/lib/ai-quota";
import { Link } from "@tanstack/react-router";
import { Sparkles, LoaderCircle, Send, CalendarPlus, Check, RotateCcw, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analysisDateTime, suggestionRows } from "@/lib/workout-suggestions";
import { insertPlannedExercises } from "@/lib/workout-edit";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** In-flight AI request survives page navigation (module scope), so leaving the AI page can keep it running. */
let pendingRun: { controller: AbortController; promise: Promise<string | null>; mode: "summary" | "plan" } | null = null;
let finishedRun: { id: string; mode: "summary" | "plan" } | null = null;

type TrainingInsightsProps = {
  exercises: Exercise[];
  hasLog: boolean;
  initialMode?: "summary" | "plan" | undefined;
};

export function TrainingInsights(props: TrainingInsightsProps) {
  const { exercises, hasLog } = props;
  const { t, language, localize } = useLanguage();
  const { readOnly } = useUserView();
  const queryClient = useQueryClient();
  const generate = useServerFn(getTrainingInsights);
  const fetchQuota = useServerFn(getMyAiQuota);
  const { data: quota } = useQuery({ queryKey: ["ai-quota", "me"], queryFn: () => fetchQuota() });
  const quotaOk = !quota || quotaAllowed(quota);
  const { data: history } = useSuspenseQuery(aiHistoryQuery);
  const { data: accepted } = useSuspenseQuery(acceptedAiQuery);
  const [gymId] = useSelectedGym();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const id = useId();
  const [mode, setMode] = useState<"summary" | "plan">(props.initialMode ?? "plan");
  const [question, setQuestion] = useState("");
  const [workoutCount, setWorkoutCount] = useState("");
  const [periodDays, setPeriodDays] = useState("");
  const [purpose, setPurpose] = useState("");
  const [minutes, setMinutes] = useState("");
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [planGym, setPlanGym] = useState<string | null | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const requestGym = mode === "plan" && planGym !== undefined ? planGym : gymId;
  const [busy, setBusy] = useState(() => pendingRun !== null);
  useEffect(() => {
    const run = pendingRun;
    if (run) {
      setMode(run.mode);
      void run.promise.then((id) => {
        setBusy(false);
        if (id) setSelectedId(id);
      });
    } else if (finishedRun) {
      setMode(finishedRun.mode);
      setSelectedId(finishedRun.id);
    }
    finishedRun = null;
  }, []);
  const blocker = useBlocker({ shouldBlockFn: () => pendingRun !== null, enableBeforeUnload: () => pendingRun !== null, withResolver: true });
  function cancel() {
    pendingRun?.controller.abort();
    pendingRun = null;
    setBusy(false);
  }
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
    if (readOnly) return;
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
        t("trainingInsights.checkWorkoutsAndDaysAt"),
      );
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setSelectedId(null);
    const controller = new AbortController();
    const runMode = mode;
    const promise = (async (): Promise<string | null> => {
      try {
        const gymId = mode === "plan" ? requestGym : getSelectedGym();
        const today = todayISO();
        const request = parsed.data;
        const response = await generate({ data: { language, gymId, today, request }, signal: controller.signal });
        if (controller.signal.aborted) return null;
        await queryClient.invalidateQueries({ queryKey: ["ai-history"] });
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
          queryClient.setQueryData(["training-insights", language, gymId, request], next);
          return next.id;
        }
        setError(response.error);
        return null;
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : t("trainingInsights.analysisFailed"));
        return null;
      }
    })();
    pendingRun = { controller, promise, mode: runMode };
    const id = await promise;
    void queryClient.invalidateQueries({ queryKey: ["ai-quota"] });
    if (pendingRun?.controller === controller) {
      pendingRun = null;
      if (id) finishedRun = { id, mode: runMode };
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
      : [{ exercises: current.insights.exercises, dayOffset: 0, title: t("trainingInsights.nextWorkout"), key: "next" }]
    : [];
  const pending = unacceptedWorkoutKeys(
    workouts.filter((workout) => workout.exercises.length).map((workout) => workout.key),
    acceptedKeys,
  );
  async function saveWorkouts(keys: string[]) {
    if (readOnly || !current || !sections.plan || saving || !keys.length) return;
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
        await insertPlannedExercises(head.data.id, suggestionRows(workout.exercises));
      }

      setSaved((previous) => new Set([...previous, ...keys.map((key) => `${historyId}:${key}`)]));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workout-suggestions"] }),
        queryClient.invalidateQueries({ queryKey: ["accepted-ai-workouts"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-history"] }),
      ]);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("trainingInsights.couldNotSaveWorkout"));
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
          disabled={readOnly || busy || saving !== null || acceptedKeys.has(key) || !items.length}
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
            ? t("trainingInsights.workoutAcceptedAsSuggestion")
            : t("trainingInsights.acceptWorkoutAsSuggestion")}
        </Button>
        {acceptedKeys.has(key) && (
          <span className="text-sm text-muted-foreground">{t("trainingInsights.listedUnderWorkouts")}</span>
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
                {suggestion.phase !== "main" && <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(`phase.${suggestion.phase}`)}</span>}
              </Link>
              <p className="text-sm font-medium">
                {exercise.equipment ? <span className="text-muted-foreground">{exercise.equipment} · </span> : null}
                {suggestion.sets} × {suggestion.reps} {t("trainingInsights.reps")}
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
      aria-label={t("trainingInsights.aiAdviceAndStrategy")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="size-5 text-primary" />
          {t("trainingInsights.aiAdviceAndStrategy")}
        </h2>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !readOnly) void analyze();
        }}
      >
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
          role="group"
          aria-label={t("trainingInsights.aiRequestType")}
        >
          {(
            [
              ["plan", t("trainingInsights.planWorkouts")],
              ["summary", t("trainingInsights.analysisQuestions")],
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
              {t("trainingInsights.yourQuestionOrRequest")}
            </label>
            <Textarea
              id={`${id}-question`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={2000}
              disabled={busy}
              placeholder={t("trainingInsights.whatShouldIPrioritizeIn")}
              className="min-h-24"
            />
          </div>
        )}
        {mode === "plan" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]">
            <div className="space-y-1">
              <label htmlFor={`${id}-count`} className="text-sm font-medium">
                {t("trainingInsights.workouts")}
              </label>
              <Input
                id={`${id}-count`}
                type="number"
                min={1}
                max={14}
                step={1}
                value={workoutCount}
                disabled={busy}
                onChange={(event) => setWorkoutCount(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${id}-days`} className="text-sm font-medium">
                {t("trainingInsights.days")}
              </label>
              <Input
                id={`${id}-days`}
                type="number"
                min={1}
                max={90}
                step={1}
                value={periodDays}
                disabled={busy}
                onChange={(event) => setPeriodDays(event.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <label htmlFor={`${id}-purpose`} className="text-sm font-medium">
                {t("trainingInsights.purpose")}
              </label>
              <Input
                id={`${id}-purpose`}
                value={purpose}
                maxLength={300}
                disabled={busy}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder={t("trainingInsights.eGSkiingStrengthOr")}
              />
            </div>
          </div>
        )}
        {mode === "plan" && (
          <div className="space-y-1">
            <label htmlFor={`${id}-minutes`} className="text-sm font-medium">
              {t("trainingInsights.approximateLengthPerWorkoutMin")}
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
                placeholder={t("trainingInsights.other")}
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
                {t("common.location")}
              </label>
              <select
                id={`${id}-gym`}
                className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={requestGym ?? ""}
                disabled={busy}
                onChange={(event) => setPlanGym(event.target.value || null)}
              >
                <option value="">{t("trainingInsights.noSpecificLocation")}</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="log-date" className="text-sm font-medium">
                {t("trainingInsights.startDate")}
              </label>
              <LogDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder={t("trainingInsights.today", { v0: todayISO() })}
              />
            </div>
          </div>
        )}
        {mode === "plan" && (
          <p className="text-sm text-muted-foreground">
            {t("trainingInsights.workoutsAndDaysAreOptional")}
          </p>
        )}
        <Button type="submit" disabled={readOnly || busy || (mode !== "plan" && !hasLog) || !quotaOk} className="w-full sm:w-auto">
          {busy ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="size-4" />
          )}
          {busy
            ? t("trainingInsights.thinking")
            : mode === "plan"
              ? t("trainingInsights.suggestWorkouts")
              : question.trim()
                ? t("trainingInsights.askAboutMyTraining")
                : current
                  ? t("trainingInsights.updateAnalysis")
                  : t("trainingInsights.analyzeMyWorkouts")}
        </Button>
        {quota && (
          <p className={`text-xs ${quotaOk ? "text-muted-foreground" : "text-destructive"}`}>
            {quota.isAdmin
              ? t("trainingInsights.aiQuotaUnlimitedAdmin")
              : quota.isBlocked
                ? t("trainingInsights.aiSuggestionsAreDisabledFor")
                : quota.quota === null
                  ? t("trainingInsights.aiQuotaUnlimitedThisMonth", { tierName: quota.tierName, used: quota.used })
                  : quotaOk
                    ? t("trainingInsights.leftThisMonthOfResets", { v0: quotaRemaining(quota), quota: quota.quota, periodEnd: quota.periodEnd })
                    : t("trainingInsights.thisMonthSQuotaIs", { used: quota.used, quota: quota.quota, periodEnd: quota.periodEnd })}
          </p>
        )}
        {quota && !quota.isAdmin && <SupporterLink className="block" />}
        {busy && (
          <Button type="button" variant="outline" className="ml-2" onClick={cancel}>
            <Square className="size-4" />
            {t("common.cancel")}
          </Button>
        )}
        {blocker.status === "blocked" && (
          <AlertDialog open onOpenChange={(o) => { if (!o) blocker.reset?.(); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("trainingInsights.aiIsStillThinking")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("trainingInsights.keepItRunningInThe")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => blocker.reset?.()}>{t("trainingInsights.stay")}</AlertDialogCancel>
                <Button variant="outline" onClick={() => { cancel(); blocker.proceed?.(); }}>{t("trainingInsights.stopAiAndLeave")}</Button>
                <AlertDialogAction onClick={() => blocker.proceed?.()}>{t("trainingInsights.keepRunning")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </form>
      {scopedHistory.length > 0 && (
        <div className="space-y-1">
          <label htmlFor={`${id}-history`} className="text-sm font-semibold">
            {t("trainingInsights.aiHistory")}
          </label>
          <select
            id={`${id}-history`}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={current?.id ?? ""}
            disabled={busy || saving !== null}
            onChange={(event) => setSelectedId(event.target.value || null)}
          >
            <option value="">{t("trainingInsights.pickAPreviousAnswer")}</option>
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
      {!hasLog && mode !== "plan" && (
        <p className="text-sm text-muted-foreground">{t("trainingInsights.noWorkoutsLoggedYet")}</p>
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
                {sections.plan ? t("trainingInsights.planned") : t("trainingInsights.analyzed")}{" "}
                {analysisDateTime(current.generatedAt)}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => reuseRequest(current.request, current.gymId)}
              >
                <RotateCcw className="size-4" />
                {t("trainingInsights.askTheSameAgain")}
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
                    <h3 className="font-bold">{t("trainingInsights.weightDevelopment")}</h3>
                    <p className="mt-1 text-sm leading-relaxed">{current.insights.weightDevelopment}</p>
                  </div>
                  <div>
                    <h3 className="font-bold">{t("trainingInsights.setDevelopment")}</h3>
                    <p className="mt-1 text-sm leading-relaxed">{current.insights.setDevelopment}</p>
                  </div>
                </div>
              </>
            )}
            {sections.plan && (
              <>
                <h3 className="text-xl font-bold">
                  {current.insights.workouts.length
                    ? t("trainingInsights.yourWorkoutPlan")
                    : t("trainingInsights.suggestedNextWorkout")}
                </h3>
                {current.insights.workouts.length > 0 && (
                  <Button
                    type="button"
                    disabled={readOnly || busy || saving !== null || pending.length === 0}
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
                      ? t("trainingInsights.allWorkoutsAcceptedAsSuggestions")
                      : t("trainingInsights.acceptAllWorkoutsAsSuggestions")}
                  </Button>
                )}
                <p className="text-sm leading-relaxed">{current.insights.recommendation}</p>
                {current.insights.goalNotes && (
                  <p className="rounded-lg border-l-4 border-brand-yellow bg-muted p-3 text-sm leading-relaxed">
                    <strong>{t("trainingInsights.yourGoals")}: </strong>
                    {current.insights.goalNotes}
                  </p>
                )}
                {current.insights.workouts.length ? (
                  <div className="divide-y divide-border">
                    {current.insights.workouts.map((workout, index) => (
                      <article
                        key={workout.dayOffset}
                        className="py-4"
                        aria-label={`${t("common.workout")} ${index + 1}`}
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
                    {saveControl(current.insights.exercises, 0, t("trainingInsights.nextWorkout"), "next")}
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

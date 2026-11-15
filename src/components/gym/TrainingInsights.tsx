import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { getSelectedGym, todayISO } from "@/lib/gym";
import { getTrainingInsights } from "@/lib/training-insights.functions";
import type { Exercise } from "@/lib/gym";
import type { TrainingInsights as Insights } from "@/lib/training-insights-schema";

export function TrainingInsights({ exercises, hasLog }: { exercises: Exercise[]; hasLog: boolean }) {
  const { t, language, localize } = useLanguage();
  const queryClient = useQueryClient();
  const generate = useServerFn(getTrainingInsights);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ insights: Insights; generatedAt: string; language: string } | null>(() => queryClient.getQueryData(["training-insights", language]) ?? null);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const response = await generate({ data: { language, gymId: getSelectedGym(), today: todayISO() } });
      if (response.insights && response.generatedAt) {
        const next = { insights: response.insights, generatedAt: response.generatedAt, language };
        setResult(next);
        queryClient.setQueryData(["training-insights", language], next);
      } else setError(response.error);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("Analysen misslyckades", "Analysis failed"));
    } finally { setBusy(false); }
  }

  const current = result?.language === language ? result : null;
  return <section className="space-y-4 border-t border-border pt-5" aria-label={t("AI-sammanfattning", "AI summary")}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="size-5 text-primary" />{t("AI-sammanfattning", "AI summary")}</h2>
      <Button onClick={analyze} disabled={busy || !hasLog}>
        {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4" />}
        {busy ? t("Analyserar…", "Analyzing…") : current ? t("Uppdatera analys", "Update analysis") : t("Analysera mina pass", "Analyze my workouts")}
      </Button>
    </div>
    {!hasLog && <p className="text-sm text-muted-foreground">{t("Inga träningsloggar ännu.", "No workouts logged yet.")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div aria-live="polite" aria-busy={busy}>
      {current && <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("Analyserad", "Analyzed")} {new Date(current.generatedAt).toLocaleString(language === "sv" ? "sv-SE" : "en-GB")}</p>
        <p className="leading-relaxed">{current.insights.summary}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><h3 className="font-bold">{t("Viktutveckling", "Weight development")}</h3><p className="mt-1 text-sm leading-relaxed">{current.insights.weightDevelopment}</p></div>
          <div><h3 className="font-bold">{t("Utveckling i set", "Set development")}</h3><p className="mt-1 text-sm leading-relaxed">{current.insights.setDevelopment}</p></div>
        </div>
        <h3 className="text-xl font-bold">{t("Förslag på nästa pass", "Suggested next workout")}</h3>
        <p className="text-sm leading-relaxed">{current.insights.recommendation}</p>
        <ul className="divide-y divide-border">
          {current.insights.exercises.map((suggestion, index) => {
            const exercise = exercises.find((exercise) => exercise.code === suggestion.code);
            if (!exercise) return null;
            return <li key={`${suggestion.code}-${index}`} className="py-3">
              <Link to="/exercises/$code" params={{ code: suggestion.code }} className="font-semibold text-primary underline-offset-4 hover:underline">{suggestion.code} · {localize(exercise).name}</Link>
              <p className="text-sm font-medium">{suggestion.sets} × {suggestion.reps} {t("reps", "reps")}{suggestion.load ? ` @ ${suggestion.load}` : ""}</p>
              <p className="mt-1 text-sm text-muted-foreground">{suggestion.reason}</p>
            </li>;
          })}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">{current.insights.caution}</p>
      </div>}
    </div>
  </section>;
}
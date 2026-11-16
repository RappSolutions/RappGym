import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TrainingInsights } from "@/components/gym/TrainingInsights";
import { exercisesQuery, gymsQuery, logQuery } from "@/lib/gym";
import { aiHistoryQuery, acceptedAiQuery } from "@/lib/ai-history";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({ meta: [
    { title: "AI – RappGym" },
    { name: "description", content: "Analysera din träning, planera pass och återvänd till din AI-historik." },
    { property: "og:title", content: "AI – RappGym" },
    { property: "og:description", content: "Analysera din träning, planera pass och återvänd till din AI-historik." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(exercisesQuery),
    context.queryClient.ensureQueryData(logQuery),
    context.queryClient.ensureQueryData(gymsQuery),
    context.queryClient.ensureQueryData(aiHistoryQuery),
    context.queryClient.ensureQueryData(acceptedAiQuery),
  ]),
  component: AiPage,
});

function AiPage() {
  const { data: exercises } = useSuspenseQuery(exercisesQuery);
  const { data: log } = useSuspenseQuery(logQuery);
  return <main className="px-4"><TrainingInsights exercises={exercises} hasLog={log.length > 0} /></main>;
}
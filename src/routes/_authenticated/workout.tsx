import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSelectedGym } from "@/hooks/use-gym";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { PlannedWorkouts } from "@/components/gym/PlannedWorkouts";
import { SpontaneousButton } from "@/components/gym/SpontaneousButton";
import { WorkoutBuilder } from "@/components/gym/WorkoutBuilder";
import { gymEquipmentQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { exercisesQuery, gymsQuery, lastByCode, logQuery, suggestionsQuery } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/workout")({
  validateSearch: (search: Record<string, unknown>): { cat?: string | undefined } => ({ cat: typeof search["cat"] === "string" ? search["cat"] : undefined }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Pass – RappGym" },
      { name: "description", content: "Planerade pass, snabbstart och egna pass." },
      { property: "og:title", content: "Pass – RappGym" },
      { property: "og:description", content: "Planerade pass, snabbstart och egna pass." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(gymsQuery),
      context.queryClient.ensureQueryData(exercisesQuery),
      context.queryClient.ensureQueryData(logQuery),
      context.queryClient.ensureQueryData(gymEquipmentQuery),
      context.queryClient.ensureQueryData(suggestionsQuery),
    ]),
  component: PassPage,
});

function PassPage() {
  const { data: everyExercise } = useSuspenseQuery(exercisesQuery);
  const allExercises = everyExercise.filter((e) => e.is_active);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [gymId] = useSelectedGym();
  const gym = gyms.find((g) => g.id === gymId);
  const { data: links } = useSuspenseQuery(gymEquipmentQuery);
  const atPlace = exercisesAtLocation(allExercises, links, gymId);
  const { data: log } = useSuspenseQuery(logQuery);
  const last = useMemo(() => lastByCode(log), [log]);

  const { t } = useLanguage();
  if (!gym) return null;

  return (
    <main className="space-y-4 px-4">
      <div className="flex items-center gap-2">
        {/* De här två delar exakt lika på resten av bredden */}
        <div className="min-w-0 flex-1">
          <SpontaneousButton gymId={gym.id} />
        </div>
        <div className="min-w-0 flex-1">
          <WorkoutBuilder exercises={atPlace} last={last} gymId={gym.id} />
        </div>

        {/* AI-knappen tar bara det utrymme som behövs för ikon + text */}
        <Button
          asChild
          variant="outline"
          className="shrink-0 px-3"
          aria-label={t("workout.planWorkoutWithAi")}
        >
          <Link to="/ai" search={{ mode: "plan" }} className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <span>AI</span>
          </Link>
        </Button>
      </div>
      <PlannedWorkouts />
    </main>
  );
}

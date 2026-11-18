import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSelectedGym } from "@/hooks/use-gym";
import { useMemo } from "react";
import { PlannedWorkouts } from "@/components/gym/PlannedWorkouts";
import { SpontaneousButton } from "@/components/gym/SpontaneousButton";
import { WorkoutBuilder } from "@/components/gym/WorkoutBuilder";
import { exerciseLocationsQuery, exercisesAtLocation } from "@/lib/exercise-locations";
import { exercisesQuery, gymsQuery, lastByCode, logQuery, suggestionsQuery } from "@/lib/gym";

export const Route = createFileRoute("/_authenticated/workout")({
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
      context.queryClient.ensureQueryData(exerciseLocationsQuery),
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
  const { data: links } = useSuspenseQuery(exerciseLocationsQuery);
  const atPlace = exercisesAtLocation(allExercises, links, gymId);
  const { data: log } = useSuspenseQuery(logQuery);
  const last = useMemo(() => lastByCode(log), [log]);

  const { t } = useLanguage();
  if (!gym) return null;

  return (
    <main className="space-y-4 px-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <SpontaneousButton gymId={gym.id} />
        </div>
        <div className="flex-1">
          <WorkoutBuilder exercises={atPlace} last={last} gymId={gym.id} />
        </div>
        <Button
          asChild
          variant="outline"
          size="icon"
          aria-label={t("Planera pass med AI", "Plan workout with AI")}
          title={t("Planera pass med AI", "Plan workout with AI")}
        >
          <Link to="/ai" search={{ mode: "plan" }}>
            ✨ AI
          </Link>
        </Button>
      </div>
      <PlannedWorkouts />
    </main>
  );
}

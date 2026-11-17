import { useLanguage } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GymPicker } from "@/components/gym/GymPicker";
import { useSelectedGym } from "@/hooks/use-gym";
import { useMemo, useState } from "react";
import { PlannedWorkouts } from "@/components/gym/PlannedWorkouts";
import { WorkoutBuilder } from "@/components/gym/WorkoutBuilder";
import { Button } from "@/components/ui/button";
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
    Promise.all([context.queryClient.ensureQueryData(gymsQuery), context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(exerciseLocationsQuery), context.queryClient.ensureQueryData(suggestionsQuery)]),
  component: PassPage,
});

function PassPage() {
  const { t } = useLanguage();
  const { data: everyExercise } = useSuspenseQuery(exercisesQuery);
  const allExercises = everyExercise.filter((e) => e.is_active);
  const { data: gyms } = useSuspenseQuery(gymsQuery);
  const [gymId, setGym] = useSelectedGym();
  const [picking, setPicking] = useState(false);
  const gym = gyms.find((g) => g.id === gymId);
  const { data: links } = useSuspenseQuery(exerciseLocationsQuery);
  const atPlace = exercisesAtLocation(allExercises, links, gymId);
  const { data: log } = useSuspenseQuery(logQuery);
  const last = useMemo(() => lastByCode(log), [log]);

  if (!gym || picking)
    return (
      <main className="px-4">
        <GymPicker gyms={gyms} selected={gym?.id ?? null} onPick={(id) => { setGym(id); setPicking(false); }} />
      </main>
    );

  return (
    <main className="space-y-4 px-4">
      <Button variant="secondary" onClick={() => setPicking(true)} className="gap-1.5 rounded-full px-3 text-sm font-medium">
        {gym.name} <span className="text-muted-foreground">· {t("byt", "change")}</span>
      </Button>
      <PlannedWorkouts />
      <WorkoutBuilder exercises={atPlace} last={last} gymId={gym.id} />
    </main>
  );
}

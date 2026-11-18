import { createFileRoute } from "@tanstack/react-router";
import { ExerciseManager } from "@/components/gym/ExerciseManager";
import { UsersManager } from "@/components/gym/UsersManager";
import { RefsManager } from "@/components/gym/RefsManager";
import { SettingsBlock } from "@/components/gym/SettingsBlock";
import { LocationsManager } from "@/components/gym/LocationsManager";
import { exerciseLocationsQuery } from "@/lib/exercise-locations";
import { exercisesQuery, gymsQuery, logQuery } from "@/lib/gym";
import { useIsAdmin } from "@/lib/roles";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Inställningar – RappGym" },
      { name: "description", content: "Hantera dina träningsplatser och övningar." },
      { property: "og:title", content: "Inställningar – RappGym" },
      { property: "og:description", content: "Hantera dina träningsplatser och övningar." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(gymsQuery), context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(exerciseLocationsQuery)]),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin, isLoading } = useIsAdmin();
  const { t } = useLanguage();
  if (isLoading) return null;
  if (!isAdmin) return <main className="px-4"><p className="rounded-xl border bg-card p-4">{t("Inställningar hanteras av administratören.", "Settings are managed by the administrator.")}</p></main>;
  return (
    <main className="space-y-3 px-4">
      <SettingsBlock title={t("Användare", "Users")}><UsersManager /></SettingsBlock>
      <SettingsBlock title={t("Platser", "Locations")}><LocationsManager /></SettingsBlock>
      <SettingsBlock title={t("Kategorier", "Categories")}><RefsManager only="cat" /></SettingsBlock>
      <SettingsBlock title={t("Redskap", "Equipment")}><RefsManager only="eq" /></SettingsBlock>
      <SettingsBlock title={t("Övningar", "Exercises")}><ExerciseManager /></SettingsBlock>
    </main>
  );
}

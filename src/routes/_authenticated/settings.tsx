import { createFileRoute } from "@tanstack/react-router";
import { ExerciseManager } from "@/components/gym/ExerciseManager";
import { UsersManager } from "@/components/gym/UsersManager";
import { AiUsageManager } from "@/components/gym/AiUsageManager";
import { RefsManager } from "@/components/gym/RefsManager";
import { SettingsBlock } from "@/components/gym/SettingsBlock";
import { LocationsManager } from "@/components/gym/LocationsManager";
import { gymEquipmentQuery } from "@/lib/exercise-locations";
import { exerciseEquipmentQuery, exercisesQuery, gymsQuery, logQuery } from "@/lib/gym";
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
    Promise.all([context.queryClient.ensureQueryData(gymsQuery), context.queryClient.ensureQueryData(exercisesQuery), context.queryClient.ensureQueryData(logQuery), context.queryClient.ensureQueryData(gymEquipmentQuery), context.queryClient.ensureQueryData(exerciseEquipmentQuery)]),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin, isLoading } = useIsAdmin();
  const { t } = useLanguage();
  if (isLoading) return null;
  if (!isAdmin) return <main className="space-y-3 px-4"><SettingsBlock title={t("settings.locations")}><LocationsManager /></SettingsBlock></main>;
  return (
    <main className="space-y-3 px-4">
      <SettingsBlock title={t("common.users")}><UsersManager /></SettingsBlock>
      <SettingsBlock title={t("settings.aiQuotasUsage")}><AiUsageManager /></SettingsBlock>
      <SettingsBlock title={t("settings.locations")}><LocationsManager /></SettingsBlock>
      <SettingsBlock title={t("settings.categories")}><RefsManager only="cat" /></SettingsBlock>
      <SettingsBlock title={t("common.equipment")}><RefsManager only="eq" /></SettingsBlock>
      <SettingsBlock title={t("common.exercises")}><ExerciseManager /></SettingsBlock>
    </main>
  );
}

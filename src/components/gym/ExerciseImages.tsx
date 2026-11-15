import type { Exercise } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";

export function ExerciseImages({ exercise }: { exercise: Exercise }) {
  const { t } = useLanguage();
  const urls = Array.isArray(exercise.image_urls) ? exercise.image_urls.filter((u): u is string => typeof u === "string" && /^(https:\/\/|\/__l5e\/assets-v1\/)/.test(u)) : [];
  if (!urls.length) return null;
  return <div className="space-y-2">{urls.map((url) => <img key={url} src={url} alt={`${exercise.code} ${exercise.name} — ${t("start- och slutposition", "start and end position")}`} className="mx-auto block w-full max-w-sm rounded-md border" />)}</div>;
}
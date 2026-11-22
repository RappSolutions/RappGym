import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { exerciseYoutubeFallback } from "@/lib/exercise-links";
import type { Exercise } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function imageUrlsOf(exercise: Pick<Exercise, "image_urls">): string[] {
  return Array.isArray(exercise.image_urls) ? exercise.image_urls.filter((u): u is string => typeof u === "string" && /^(https:\/\/|\/__l5e\/assets-v1\/|storage:)/.test(u)) : [];
}

/** Resolves stored image references (private storage paths get a temporary signed link). */
export function useImageSrc(url: string) {
  const path = url.startsWith("storage:") ? url.slice(8) : null;
  const { data } = useQuery({
    queryKey: ["exercise-image", path], enabled: !!path, staleTime: 50 * 60_000,
    queryFn: async () => { if (!path) return null; const { data, error } = await supabase.storage.from("exercise-images").createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; },
  });
  return path ? data : url;
}

export function ExerciseImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const src = useImageSrc(url);
  return src ? <img src={src} alt={alt} className={className} /> : <div className={`${className ?? ""} aspect-[3/2] animate-pulse bg-muted`} />;
}

export function ExerciseImages({ exercise }: { exercise: Exercise }) {
  const { t } = useLanguage();
  const urls = imageUrlsOf(exercise);
  const preview = exerciseYoutubeFallback(urls, exercise.instructions);
  if (preview) return <YoutubeFallback key={preview.image} preview={preview} name={exercise.name} />;
  if (!urls.length) return null;
  return <div className="space-y-2">{urls.map((url) => <ExerciseImage key={url} url={url} alt={`${exercise.code} ${exercise.name} — ${t("exerciseImages.startAndEndPosition")}`} className="mx-auto block w-full max-w-sm rounded-md border" />)}</div>;
}

function YoutubeFallback({ preview, name }: { preview: { href: string; image: string }; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <a href={preview.href} target="_blank" rel="noopener noreferrer" className="mx-auto block w-full max-w-sm rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <img src={preview.image} alt={name} loading="lazy" onError={() => setFailed(true)} className="block aspect-[4/3] w-full rounded-md border object-contain" />
  </a>;
}

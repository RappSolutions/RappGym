import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "avatars";
/** Storage path of a user's own uploaded picture. */
export const avatarPath = (userId: string) => `${userId}/avatar`;

/** Uploaded picture (versioned flag in auth metadata) wins over the OAuth provider picture. */
export function avatarSource(meta: Record<string, unknown>): { custom: number } | { url: string } | null {
  const v = meta["custom_avatar"];
  if (typeof v === "number" && v > 0) return { custom: v };
  for (const key of ["avatar_url", "picture"]) {
    const u = meta[key];
    if (typeof u === "string" && /^https:\/\//.test(u)) return { url: u };
  }
  return null;
}

export function useAvatarUrl(user: User): string | undefined {
  const src = avatarSource(user.user_metadata ?? {});
  const custom = src && "custom" in src ? src.custom : 0;
  const { data, isError } = useQuery({
    queryKey: ["avatar", user.id, custom],
    enabled: custom > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(avatarPath(user.id), 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!src) return undefined;
  if ("url" in src) return src.url;
  if (data) return data;
  const meta = user.user_metadata ?? {};
  const fb = avatarSource({ ...meta, custom_avatar: null });
  return isError && fb && "url" in fb ? fb.url : undefined;
}

export async function uploadAvatar(userId: string, file: Blob) {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(avatarPath(userId), file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw error;
  const { error: e2 } = await supabase.auth.updateUser({ data: { custom_avatar: Date.now() } });
  if (e2) throw e2;
}

export async function removeAvatar(userId: string) {
  await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath(userId)]);
  const { error } = await supabase.auth.updateUser({ data: { custom_avatar: null } });
  if (error) throw error;
}

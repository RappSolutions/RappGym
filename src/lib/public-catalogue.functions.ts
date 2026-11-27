import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
export const getPublicCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Catalogue unavailable");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data, error } = await client.rpc("public_exercise_catalogue");
  if (error) throw new Error(error.message);
  return Promise.all(
    data.map(async (row) => {
      const refs = Array.isArray(row.image_urls)
        ? row.image_urls.filter((v): v is string => typeof v === "string").slice(0, 3)
        : [];
      const images = await Promise.all(
        refs.map(async (ref) => {
          if (!ref.startsWith("storage:")) return ref.startsWith("https://") ? ref : null;
          const signed = await client.storage
            .from("exercise-images")
            .createSignedUrl(ref.slice(8), 3600);
          if (!signed.data) return null;
          return signed.data.signedUrl.replace(url, import.meta.env["VITE_SUPABASE_URL"]);
        }),
      );
      return { ...row, image_urls: images.filter((v): v is string => v !== null) };
    }),
  );
});

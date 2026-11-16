import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

/** Generates one exercise illustration on explicit request and stores it in the caller's private folder. */
export const generateExerciseImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ exerciseId: z.string().uuid(), wishes: z.string().max(1000).default("") }))
  .handler(async ({ data, context }): Promise<{ path: string | null; error: string | null }> => {
    const { supabase, userId } = context;
    const { data: ex } = await supabase.from("exercises").select("id,code,name,equipment,instructions,variant").eq("id", data.exerciseId).eq("user_id", userId).maybeSingle();
    if (!ex) return { path: null, error: "Exercise not found." };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { path: null, error: "AI is not configured." };
    const prompt = [
      "Clean instructional fitness illustration on a plain white background, two panels side by side showing the start position and the end position of the exercise.",
      "Simple flat vector style, one neutral athletic figure, clear body posture, subtle arrows showing the movement, no text, no logos.",
      `Exercise: ${ex.name}. Equipment: ${ex.equipment || "none"}. Variation: ${ex.variant || "standard"}.`,
      ex.instructions ? `How it is performed: ${ex.instructions}` : "",
      data.wishes.trim() ? `User wishes (follow if reasonable): ${data.wishes.trim()}` : "",
    ].filter(Boolean).join("\n");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1536x1024" }),
    });
    if (!res.ok) {
      let message = `AI error ${res.status}`;
      try { const body = await res.json(); message = body.message ?? body.error?.message ?? message; } catch { /* keep */ }
      return { path: null, error: message };
    }
    const body = await res.json() as { data?: { b64_json?: string }[] };
    const b64 = body.data?.[0]?.b64_json;
    if (!b64) return { path: null, error: "The AI returned no image." };
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/${ex.id}-${Date.now()}.png`;
    const { error } = await supabase.storage.from("exercise-images").upload(path, bytes, { contentType: "image/png" });
    if (error) return { path: null, error: error.message };
    return { path: `storage:${path}`, error: null };
  });

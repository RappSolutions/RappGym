import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const imageSchema = z.string().max(4_000_000).refine((s) => /^https?:\/\//i.test(s) || /^data:image\/(jpeg|png|webp|gif);base64,/.test(s), "Invalid image");

export const scanLocationPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ gymId: z.string().uuid(), image: imageSchema, language: z.enum(["sv", "en"]) }))
  .handler(async ({ data, context }): Promise<{ exerciseIds: string[]; equipment: string; error: string | null }> => {
    const { supabase, userId } = context;
    const sv = data.language === "sv";
    const fail = (error: string) => ({ exerciseIds: [], equipment: "", error });
    const { data: gym } = await supabase.from("gyms").select("id").eq("id", data.gymId).maybeSingle();
    if (!gym) return fail(sv ? "Platsen hittades inte." : "Location not found.");
    const { data: exercises, error } = await supabase.from("exercises").select("id,code,name,equipment,category").eq("is_active", true);
    if (error) throw new Error(error.message);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fail(sv ? "AI är inte konfigurerad ännu." : "AI is not configured yet.");
    try {
      const { scanLocationImage } = await import("@/lib/ai/location-scan.server");
      const result = scanLocationImage(getRequest(), key, data.image, exercises.map(({ code, name, equipment, category }) => ({ code, name, equipment, category })), data.language);
      const output = await result.output;
      const wanted = new Set(output.codes.map((c) => c.toUpperCase()));
      return { exerciseIds: exercises.filter((e) => wanted.has(e.code.toUpperCase())).map((e) => e.id), equipment: output.equipment.slice(0, 300), error: null };
    } catch (err) {
      const { APICallError } = await import("ai");
      if (APICallError.isInstance(err)) {
        let message = err.message;
        try { const body = JSON.parse(err.responseBody ?? "{}"); message = body.message ?? body.error?.message ?? message; } catch { /* keep */ }
        return fail(message);
      }
      return fail(sv ? "Bilden kunde inte analyseras. Kontrollera att länken går direkt till en bild." : "The photo could not be analysed. Make sure the link points directly to an image.");
    }
  });

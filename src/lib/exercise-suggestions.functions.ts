import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertUserViewWritable } from "@/lib/user-view-guard";
import { exerciseSuggestionSchema } from "./exercise-suggestions";

export const sendExerciseSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(exerciseSuggestionSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertUserViewWritable(supabase);
    const [identity, category, equipment, completed, workouts] = await Promise.all([
      supabase.auth.getUser(),
      data.category_id ? supabase.from("exercise_categories").select("name").eq("id", data.category_id).single() : Promise.resolve({ data: null, error: null }),
      data.equipment_id ? supabase.from("exercise_equipment").select("name").eq("id", data.equipment_id).single() : Promise.resolve({ data: null, error: null }),
      supabase.from("log_entries").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("workouts").select("id", { count: "exact", head: true }),
    ]);
    const user = identity.data.user;
    if (identity.error || !user?.email || category.error || equipment.error) throw new Error("Invalid suggestion context");
    const { data: row, error } = await supabase.from("exercise_suggestions").insert({
      ...data, source_url: data.source_url || null, user_id: userId,
    }).select("id").single();
    if (error) throw new Error("Could not save exercise suggestion");
    const { sendSupportEmail } = await import("./support-email.server");
    const delivered = await sendSupportEmail({
      id: row.id, kind: "exercise-suggestion", senderEmail: user.email,
      senderName: String(user.user_metadata["full_name"] ?? user.user_metadata["name"] ?? ""),
      message: `Exercise: ${data.name}\nCategory: ${category.data?.name ?? "—"}\nEquipment: ${equipment.data?.name ?? "—"}\nLink: ${data.source_url || "—"}\n\n${data.instructions}`,
      diagnostics: { userId, provider: user.app_metadata["provider"] ?? "", createdAt: user.created_at.slice(0, 10), completedSets: completed.count ?? 0, workouts: workouts.count ?? 0 },
    });
    return { id: row.id, delivered };
  });
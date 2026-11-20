import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { i18n } from "@/lib/i18n-core";
import { userViewCanWrite } from "@/lib/impersonation-policy";

/** Use before side effects, privileged clients or paid requests; RLS separately blocks browser writes. */
export async function assertUserViewWritable(client: SupabaseClient<Database>, language: "sv" | "en" = "sv") {
  const { data, error } = await client.rpc("user_view_active");
  if (error) throw new Error(error.message);
  if (!userViewCanWrite(data)) throw new Error(i18n.getFixedT(language)("userView.readOnly"));
}
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** The signed-in user's roles; RLS only exposes the caller's own rows. Write access is enforced by the database. */
export const myRolesQuery = queryOptions({
  queryKey: ["my-roles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("user_roles").select("role");
    if (error) throw new Error(error.message);
    return data.map((r) => r.role);
  },
});

export function useIsAdmin() {
  const { data, isLoading } = useQuery(myRolesQuery);
  return { isAdmin: !!data?.includes("admin"), isLoading };
}

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pass")({
  validateSearch: (search: Record<string, unknown>) => ({ cat: typeof search.cat === "string" ? search.cat : undefined }),
  beforeLoad: ({ search }) => { throw redirect({ to: "/workout", replace: true, search: { cat: search.cat } }); },
});

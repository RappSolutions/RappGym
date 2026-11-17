import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/statistics")({
  beforeLoad: () => { throw redirect({ to: "/home", replace: true }); },
});

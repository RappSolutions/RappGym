import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/logg")({
  beforeLoad: () => { throw redirect({ to: "/log", replace: true }); },
});

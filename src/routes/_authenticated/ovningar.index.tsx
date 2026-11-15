import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ovningar/")({
  beforeLoad: () => { throw redirect({ to: "/exercises", replace: true }); },
});

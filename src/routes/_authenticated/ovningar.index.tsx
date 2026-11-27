import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ovningar/")({
  beforeLoad: () => { throw redirect({ to: "/exercise-bank", replace: true }); },
});

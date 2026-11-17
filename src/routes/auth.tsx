import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL: sign-in now lives on the landing page "/".
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});

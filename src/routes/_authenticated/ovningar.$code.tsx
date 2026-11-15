import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ovningar/$code")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/exercises/$code", params: { code: params.code }, replace: true }); },
});

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Träningsdagbok – logga dina gympass" },
      { name: "description", content: "Snabb loggning av set, vikt och reps med din egen övningsbank." },
      { property: "og:title", content: "Träningsdagbok – logga dina gympass" },
      { property: "og:description", content: "Snabb loggning av set, vikt och reps med din egen övningsbank." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pass", replace: true });
    });
  }, [navigate]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <Dumbbell className="h-10 w-10" />
      </div>
      <h1 className="text-5xl font-extrabold uppercase">Träningsdagbok</h1>
      <p className="max-w-sm text-muted-foreground">
        Välj kategori, tryck på övningen och logga. Din övningsbank och historik finns alltid med dig i gymmet.
      </p>
      <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
        <Link to="/auth">Logga in</Link>
      </Button>
    </main>
  );
}

import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "RappGym – log your workouts" },
      { name: "description", content: "Snabb loggning av set, vikt och reps med din egen övningsbank." },
      { property: "og:title", content: "RappGym – log your workouts" },
      { property: "og:description", content: "Snabb loggning av set, vikt och reps med din egen övningsbank." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t, language, localize } = useLanguage();
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);
  return (
    <main className="app-sheet mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
        <Dumbbell className="h-10 w-10" />
      </div>
      <LanguagePicker />
      <h1 className="text-5xl font-extrabold uppercase">{"RappGym"}</h1>
      <p className="max-w-sm text-muted-foreground">
        {t("Din träningsdagbok och övningsbank.", "Your workout diary and exercise bank.")}
      </p>
      <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
        <Link to="/auth">{t("Logga in", "Sign in")}</Link>
      </Button>
    </main>
  );
}

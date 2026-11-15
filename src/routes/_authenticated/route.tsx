import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, House, BookOpen, Dumbbell, History, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LanguagePicker, useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const tabs = [
  { to: "/home", label: "Hem", icon: House },
  { to: "/workout", label: "Pass", icon: Dumbbell },
  { to: "/exercises", label: "Övningar", icon: BookOpen },
  { to: "/log", label: "Logg", icon: History },
  { to: "/statistics", label: "Statistik", icon: BarChart3 },
] as const;

const pageLabels: [RegExp, string, string][] = [
  [/^\/home/, "Hem", "Home"],
  [/^\/workout/, "Pass", "Workout"],
  [/^\/exercises/, "Övningar", "Exercises"],
  [/^\/log/, "Logg", "Log"],
  [/^\/statistics/, "Statistik", "Statistics"],
];

function AppLayout() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const match = pageLabels.find(([re]) => re.test(pathname));
  const page = match ? t(match[1], match[2]) : "";
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="app-sheet mx-auto min-h-screen max-w-2xl pb-24 md:max-w-4xl">
      <header className="app-masthead mb-6 flex items-center justify-between gap-3 px-4 py-5">
        <span className="brand-wordmark font-display text-2xl font-bold md:text-3xl">
          Rapp<span className="text-brand-yellow">Gym</span>
          {page && <span className="ml-2 text-brand-yellow">– {page}</span>}
        </span>
        <div className="flex items-center gap-2"><LanguagePicker /><Button variant="ghost" size="icon" onClick={signOut} aria-label={t("Logga ut", "Sign out")} className="text-brand-yellow hover:bg-brand-royal hover:text-brand-yellow">
          <LogOut className="h-5 w-5" />
        </Button></div>
      </header>
      <Outlet />
      <nav className="app-navigation fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-brand-yellow font-bold text-brand-royal" }}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-6 w-6 ${isActive ? "text-brand-blue" : ""}`} />
                  {t(label, to === "/home" ? "Home" : to === "/workout" ? "Workout" : to === "/exercises" ? "Exercises" : to === "/log" ? "Log" : "Statistics")}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

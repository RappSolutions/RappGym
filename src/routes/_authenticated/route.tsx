import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { House, Dumbbell, CalendarDays, ClipboardCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { ProfileMenu } from "@/components/gym/ProfileMenu";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AppLayout,
});

const tabs = [
  { to: "/home", label: "Hem", en: "Home", icon: House },
  { to: "/ai", label: "AI", en: "AI", icon: Sparkles },
  { to: "/exercises", label: "Övningar", en: "Exercises", icon: Dumbbell },
  { to: "/workout", label: "Pass", en: "Workouts", icon: CalendarDays },
  { to: "/log", label: "Logg", en: "Log", icon: ClipboardCheck },
] as const;

const pageLabels: [RegExp, string, string][] = [
  [/^\/home/, "Hem", "Home"],
  [/^\/workout/, "Pass", "Workouts"],
  [/^\/exercises/, "Övningar", "Exercises"],
  [/^\/log/, "Logg", "Log"],
  [/^\/ai/, "AI", "AI"],
  [/^\/settings/, "Inställningar", "Settings"],
];

function AppLayout() {
  const { user } = Route.useRouteContext();
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
    navigate({ to: "/", replace: true });
  }
  return (
    <div className="app-sheet mx-auto min-h-screen max-w-2xl pb-24 md:max-w-4xl">
      <header className="app-masthead mb-6 flex items-center justify-between gap-3 px-4 py-5">
        <Link to="/home" aria-label={t("Till Hem", "Go to Home")} className="brand-wordmark min-w-0 truncate font-display text-2xl font-bold no-underline hover:opacity-90 md:text-3xl">
          Rapp<span className="text-brand-yellow">Gym</span>
          {page && <span className="ml-2 text-brand-yellow">– {page}</span>}
        </Link>
        <div className="flex shrink-0 items-center"><ProfileMenu user={user} onSignOut={signOut} /></div>
      </header>
      <Outlet />
      <nav className="app-navigation fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map(({ to, label, en, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground"
              activeProps={{ className: "bg-brand-yellow font-bold text-brand-royal" }}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-6 w-6 ${isActive ? "text-brand-blue" : ""}`} />
                   {t(label, en)}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

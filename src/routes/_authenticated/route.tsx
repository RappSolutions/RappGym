import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { House, Dumbbell, CalendarDays, ClipboardCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { CategoryStyles } from "@/components/gym/CategoryStyles";
import { ProfileMenu } from "@/components/gym/ProfileMenu";
import { cn } from "@/lib/utils";

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

// Active-tab marker style for the bottom navigation: "chip" (default) or "block".
const NAV_STYLE: "chip" | "block" =
  typeof window !== "undefined" && window.localStorage.getItem("navStyle") === "block" ? "block" : "chip";

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
      <CategoryStyles />
      <Outlet />
      <nav className="app-navigation fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map(({ to, label, en, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              data-nav-style={NAV_STYLE}
              className={cn(
                "nav-tab group relative flex h-[72px] flex-col items-center text-xs font-medium transition-colors",
                NAV_STYLE === "block" ? "justify-center p-2" : "justify-center gap-1 text-muted-foreground",
              )}
              activeProps={{ className: "is-active" }}
            >
              {({ isActive }) =>
                NAV_STYLE === "block" ? (
                  <span
                    className={cn(
                      "flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl transition-colors",
                      isActive
                        ? "bg-brand-blue text-primary-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    <span className="flex h-9 items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span data-navlabel>{t(label, en)}</span>
                  </span>
                ) : (
                  <>
                    <span
                      className={cn(
                        "flex h-9 w-16 items-center justify-center rounded-full transition-colors",
                        isActive ? "bg-brand-blue" : "bg-transparent",
                      )}
                    >
                      <Icon
                        className={cn("h-6 w-6", isActive ? "text-primary-foreground" : "text-muted-foreground")}
                      />
                    </span>
                    <span data-navlabel className={cn(isActive ? "font-semibold text-brand-blue" : "text-muted-foreground")}>
                      {t(label, en)}
                    </span>
                  </>
                )
              }
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

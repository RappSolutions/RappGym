import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { parseAuthCallbackError, type AuthCallbackError } from "@/lib/auth-callback-error";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { authProviders, type AuthProvider } from "@/lib/auth-providers";
import rappgymLogo from "@/assets/rappgym-logo-berlin.png";
import rappSolutionsLogo from "@/assets/RappSolutionsAB_200x112.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "RappGym – log your workouts" },
      { name: "description", content: "Your workout diary and exercise bank. Sign in with Google or Microsoft." },
      { property: "og:title", content: "RappGym – log your workouts" },
      {
        property: "og:description",
        content: "Your workout diary and exercise bank. Sign in with Google or Microsoft.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<AuthCallbackError | null>(null);
  const [pending, setPending] = useState<AuthProvider | null>(null);
  const [checking, setChecking] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const waiting = checking || pending !== null;
  useEffect(() => {
    const err = parseAuthCallbackError(window.location.hash, window.location.search);
    if (err) {
      setAuthError(err);
      window.history.replaceState(null, "", window.location.pathname);
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  async function social(provider: AuthProvider) {
    if (pending) return;
    setAuthError(null);
    setPending(provider);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      setPending(null);
      toast.error(
        result.error instanceof Error ? result.error.message : t("Inloggningen misslyckades", "Sign-in failed"),
      );
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <div aria-busy={waiting} className={`app-sheet mx-auto flex min-h-screen${waiting ? " cursor-wait" : ""} max-w-2xl flex-col pb-12 md:max-w-4xl`}>
      <header className="app-masthead flex items-center justify-between gap-3 px-4 py-5">
        <span className="brand-wordmark font-display text-2xl font-bold md:text-3xl">RappGym</span>
        <LanguagePicker flagsOnly />
      </header>
      <main className="landing-hero relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
        <div className="landing-glow" aria-hidden="true" />
        <div className="landing-logo-shell relative">
          <img
            src={rappgymLogo}
            alt="RappGym"
            width={240}
            height={240}
            onClick={() => !waiting && setSpinning(true)}
            onAnimationEnd={(e) => e.animationName === "landing-spin-hop" && setSpinning(false)}
            className={`landing-logo relative block h-44 w-44 object-contain md:h-60 md:w-60 ${waiting ? "is-waiting" : spinning ? "is-spinning cursor-pointer" : "cursor-pointer"}`}
          />
        </div>
        <h1 className="landing-rise relative mt-6 font-display text-5xl font-bold text-brand-blue md:text-6xl">
          RappGym
        </h1>
        <p className="landing-rise relative mt-3 max-w-sm text-muted-foreground [animation-delay:120ms]">
          {t("Logga pass, följ cirklar, se din progress.", "Log workouts, run circuits, track your progress.")}
        </p>
        <div className="landing-rise relative mt-8 w-full max-w-sm space-y-3 [animation-delay:240ms]">
          {waiting && (
            <p role="status" className="text-sm font-medium text-muted-foreground">
              {checking ? t("Loggar in…", "Signing in…") : t(`Ansluter till ${pending === authProviders[0] ? "Google" : "Microsoft"}…`, `Connecting to ${pending === authProviders[0] ? "Google" : "Microsoft"}…`)}
            </p>
          )}
          {authError && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive">
              <p className="font-semibold">
                {authError.kind === "rejected"
                  ? t("Inloggningen nekades", "Sign-in was rejected")
                  : authError.kind === "cancelled"
                    ? t("Inloggningen avbröts", "Sign-in was cancelled")
                    : t("Inloggningen misslyckades", "Sign-in failed")}
              </p>
              {authError.kind === "rejected" && (
                <p className="mt-1">
                  {t(
                    "Kontot kan vara inaktiverat. Kontakta administratören om du tror att det är fel.",
                    "The account may be disabled. Contact the administrator if you think this is wrong.",
                  )}
                </p>
              )}
              <p className="mt-1 text-xs opacity-80">{authError.description}</p>
            </div>
          )}
          <Button
            variant="outline"
            type="button"
            disabled={waiting}
            onClick={() => social(authProviders[0])}
            className="google-btn landing-btn w-full"
          >
            <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            {t("Fortsätt med Google", "Continue with Google")}
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={waiting}
            onClick={() => social(authProviders[1])}
            className="google-btn landing-btn w-full"
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {t("Fortsätt med Microsoft", "Continue with Microsoft")}
          </Button>
          <p className="pt-2 text-xs text-muted-foreground">
            {t("Endast befintliga Google- eller Microsoft-konton.", "Existing Google or Microsoft accounts only.")}
          </p>
        </div>
      </main>
      <footer className="flex flex-col items-center gap-2 pb-4 pt-6 text-center text-[11px] tracking-wide text-muted-foreground">
        <img
          src={rappSolutionsLogo}
          alt="Rapp Solutions AB"
          width={200}
          height={112}
          className="h-12 w-auto rounded-md ring-1 ring-foreground/10"
        />
        <span>
          Provided by <span className="font-semibold text-foreground/80">Rapp Solutions AB</span> · Sweden
        </span>
      </footer>
    </div>
  );
}

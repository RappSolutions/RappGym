import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { authProviders, type AuthProvider } from "@/lib/auth-providers";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Logga in – RappGym" },
      { name: "description", content: "Logga in för att se och logga dina pass." },
      { property: "og:title", content: "Logga in – RappGym" },
      { property: "og:description", content: "Logga in för att se och logga dina pass." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  async function social(provider: AuthProvider) {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(
        result.error instanceof Error ? result.error.message : t("Inloggningen misslyckades", "Sign-in failed"),
      );
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="app-sheet mx-auto flex min-h-screen max-w-2xl flex-col pb-12 md:max-w-4xl">
      <header className="app-masthead mb-6 flex items-center justify-between gap-3 px-4 py-5">
        <span className="brand-wordmark font-display text-2xl font-bold md:text-3xl">RappGym</span>
        <LanguagePicker flagsOnly />
      </header>
      <main className="flex flex-1 items-start justify-center px-6">
        <div className="w-full max-w-sm space-y-5 py-10">
          <h1 className="text-3xl font-extrabold uppercase">{t("Logga in", "Sign in")}</h1>
          <Button variant="outline" type="button" onClick={() => social(authProviders[0])} className="google-btn">
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
          <Button variant="outline" type="button" onClick={() => social(authProviders[1])} className="google-btn">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {t("Fortsätt med Microsoft", "Continue with Microsoft")}
          </Button>
        </div>
      </main>
    </div>
  );
}

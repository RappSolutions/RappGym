import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
  const { t, language, localize } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/workout", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/workout", replace: true });
        else toast.success(t("Kolla din e-post och bekräfta kontot.", "Check your email to confirm your account."));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Något gick fel", "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "microsoft") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : t("Inloggningen misslyckades", "Sign-in failed"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/workout", replace: true });
  }

  return (
    <main className="app-sheet mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 py-10">
        <div className="app-masthead flex items-center justify-between gap-3 p-4"><span className="brand-wordmark text-3xl font-bold">RappGym</span><LanguagePicker /></div>
        <h1 className="text-3xl font-extrabold uppercase">{mode === "in" ? t("Logga in", "Sign in") : t("Skapa konto", "Create account")}</h1>
        <Button variant="outline" type="button" onClick={() => social("google")} className="google-btn">
          <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          {t("Fortsätt med Google", "Continue with Google")}
        </Button>
        <Button variant="outline" type="button" onClick={() => social("microsoft")} className="google-btn">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
          {t("Fortsätt med Microsoft", "Continue with Microsoft")}
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />{t("eller e-post", "or email")}<div className="h-px flex-1 bg-border" /></div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("E-post", "Email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">{t("Lösenord", "Password")}</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
          {mode === "in" ? t("Logga in", "Sign in") : t("Skapa konto", "Create account")}
        </Button>
        <Button variant="link" type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? t("Inget konto? Skapa ett", "No account? Create one") : t("Har du konto? Logga in", "Already have an account? Sign in")}
        </Button>
      </form>
    </main>
  );
}

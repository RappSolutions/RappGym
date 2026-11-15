import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in – Träningsdagbok" },
      { name: "description", content: "Logga in för att se och logga dina pass." },
      { property: "og:title", content: "Logga in – Träningsdagbok" },
      { property: "og:description", content: "Logga in för att se och logga dina pass." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
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
        navigate({ to: "/pass", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/pass", replace: true });
        else toast.success("Kolla din e-post och bekräfta kontot.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6">
        <h1 className="text-3xl font-extrabold uppercase">{mode === "in" ? "Logga in" : "Skapa konto"}</h1>
        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Lösenord</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
          {mode === "in" ? "Logga in" : "Skapa konto"}
        </Button>
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Inget konto? Skapa ett" : "Har du konto? Logga in"}
        </button>
      </form>
    </main>
  );
}

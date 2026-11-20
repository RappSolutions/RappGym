import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getUserView, endUserView, type UserView } from "@/lib/user-view.functions";
import { useLanguage } from "@/lib/i18n";
import { setGymViewScope } from "@/lib/gym";

const UserViewContext = createContext<UserView | null>(null);
export function useUserView() {
  const view = useContext(UserViewContext);
  return { view, readOnly: view?.readOnly ?? false };
}

/** A full context boundary: no cached personal rows or mounted editor survives switching. */
export function UserViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<UserView | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const getView = useServerFn(getUserView);
  const endView = useServerFn(endUserView);
  const qc = useQueryClient();
  const { t } = useLanguage();

  useEffect(() => {
    let alive = true;
    let current: UserView | null = null;
    const channel = new BroadcastChannel("rappgym-user-view");
    async function check(initial = false) {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && data.user) throw error;
        const next = data.user ? await getView() : null;
        if (!alive) return;
        if (!initial && (next?.userId !== current?.userId || next?.readOnly !== current?.readOnly)) {
          window.location.reload();
          return;
        }
        if (initial) {
          await qc.cancelQueries();
          qc.clear();
          if (!alive) return;
          setGymViewScope(next?.actorId ?? "", next?.userId ?? "");
          current = next;
          setView(next);
          setReady(true);
        }
      } catch {
        if (alive) { setFailed(true); setReady(false); }
      }
    }
    void check(true);
    const recheck = () => { void check(); };
    channel.onmessage = recheck;
    window.addEventListener("focus", recheck);
    return () => { alive = false; channel.close(); window.removeEventListener("focus", recheck); };
  }, [getView, qc]);

  async function exit() {
    setBusy(true);
    try {
      await endView();
      await qc.cancelQueries();
      qc.clear();
      const channel = new BroadcastChannel("rappgym-user-view");
      channel.postMessage("changed"); channel.close();
      window.location.assign("/home");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("userView.failed"));
      setBusy(false);
    }
  }

  if (failed) return <div className="mx-auto max-w-2xl space-y-3 bg-background p-4"><p role="alert">{t("userView.failed")}</p><Button variant="outline" disabled={busy} onClick={() => void exit()}><LogOut />{t("userView.exit")}</Button></div>;
  if (!ready) return <p className="mx-auto max-w-2xl bg-background p-4 text-muted-foreground" role="status">{t("common.loading")}</p>;
  return <UserViewContext.Provider value={view}>
    {view?.readOnly && <aside className="sticky top-0 z-50 mx-auto flex max-w-2xl flex-wrap items-center gap-2 border-b border-primary bg-brand-yellow px-4 py-2 text-foreground md:max-w-4xl" aria-label={t("userView.readOnly")}>
      <Eye className="size-4 shrink-0" />
      <div className="min-w-0 flex-1 text-sm"><strong className="block break-words">{t("userView.viewing", { name: view.name || view.email })}</strong><span className="block break-words text-xs">{view.email} · {t("userView.readOnly")}</span></div>
      <Button variant="outline" size="sm" className="shrink-0" disabled={busy} onClick={() => void exit()}><LogOut />{t("userView.exit")}</Button>
    </aside>}
    {children}
  </UserViewContext.Provider>;
}
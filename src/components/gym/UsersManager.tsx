import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, CheckCircle2, ShieldMinus, ShieldPlus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listUsers, manageUser } from "@/lib/admin-users.functions";
import { formatDate } from "@/lib/gym";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

/** Admin-only list of everyone who has signed in, with role, disable and delete actions. */
export function UsersManager() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const manage = useServerFn(manageUser);
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  async function act(userId: string, action: "makeAdmin" | "removeAdmin" | "disable" | "enable" | "delete", confirmText: string) {
    if (!confirm(confirmText)) return;
    try { await manage({ data: { userId, action } }); toast.success(t("Klart", "Done")); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return <section className="space-y-3 rounded-xl border bg-card p-4" aria-label={t("Användare", "Users")}>
    <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Users className="size-5 text-primary" />{t("Användare", "Users")}</h2>
    {isLoading && <p className="text-sm text-muted-foreground">{t("Laddar…", "Loading…")}</p>}
    {error && <p className="text-sm text-destructive">{error.message}</p>}
    <ul className="divide-y divide-border">{users.map((u) => {
      const self = u.id === me;
      const who = u.name || u.email;
      return <li key={u.id} className="space-y-2 py-3">
        <div className={u.disabled ? "text-muted-foreground" : ""}>
          <div className="font-medium">{who}{u.isAdmin && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">Admin</span>}{u.disabled && <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">{t("Inaktiverad", "Disabled")}</span>}{self && <span className="ml-2 text-xs text-muted-foreground">({t("du", "you")})</span>}</div>
          <div className="text-xs text-muted-foreground">{u.email} · {u.provider} · {t("Skapad", "Created")} {formatDate(u.createdAt.slice(0, 10))}{u.lastSignIn ? ` · ${t("Senast inloggad", "Last sign-in")} ${formatDate(u.lastSignIn.slice(0, 10))}` : ""}</div>
        </div>
        {!self && <div className="flex flex-wrap gap-2">
          {u.isAdmin
            ? <Button size="sm" variant="outline" onClick={() => void act(u.id, "removeAdmin", t(`Ta bort admin för ${who}?`, `Remove admin from ${who}?`))}><ShieldMinus className="size-4" />{t("Ta bort admin", "Remove admin")}</Button>
            : <Button size="sm" variant="outline" onClick={() => void act(u.id, "makeAdmin", t(`Gör ${who} till admin?`, `Make ${who} an admin?`))}><ShieldPlus className="size-4" />{t("Gör till admin", "Make admin")}</Button>}
          {u.disabled
            ? <Button size="sm" variant="outline" onClick={() => void act(u.id, "enable", t(`Aktivera ${who} igen?`, `Enable ${who} again?`))}><CheckCircle2 className="size-4" />{t("Aktivera", "Enable")}</Button>
            : <Button size="sm" variant="outline" onClick={() => void act(u.id, "disable", t(`Inaktivera ${who}? Personen kan inte logga in.`, `Disable ${who}? They can no longer sign in.`))}><Ban className="size-4" />{t("Inaktivera", "Disable")}</Button>}
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => void act(u.id, "delete", t(`Ta bort ${who} permanent, med all deras träningsdata?`, `Permanently delete ${who} and all their training data?`))}><Trash2 className="size-4" />{t("Ta bort", "Delete")}</Button>
        </div>}
      </li>;
    })}</ul>
  </section>;
}

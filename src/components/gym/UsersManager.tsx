import { confirmDialog } from "@/components/gym/ConfirmHost";
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
    if (!await confirmDialog(confirmText)) return;
    try { await manage({ data: { userId, action } }); toast.success(t("usersManager.done")); }
    catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return <section className="space-y-3" aria-label={t("common.users")}>
    {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
    {error && <p className="text-sm text-destructive">{error.message}</p>}
    <ul className="divide-y divide-border">{users.map((u) => {
      const self = u.id === me;
      const who = u.name || u.email;
      return <li key={u.id} className="space-y-2 py-3">
        <div className={u.disabled ? "text-muted-foreground" : ""}>
          <div className="font-medium">{who}{u.isAdmin && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">Admin</span>}{u.disabled && <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">{t("usersManager.disabled")}</span>}{self && <span className="ml-2 text-xs text-muted-foreground">({t("usersManager.you")})</span>}</div>
          <div className="text-xs text-muted-foreground">{u.email} · {u.provider} · {t("usersManager.created")} {formatDate(u.createdAt.slice(0, 10))}{u.lastSignIn ? ` · ${t("usersManager.lastSignIn")} ${formatDate(u.lastSignIn.slice(0, 10))}` : ""}</div>
        </div>
        {!self && <div className="flex flex-wrap gap-2">
          {u.isAdmin
            ? <Button size="sm" variant="outline" onClick={() => void act(u.id, "removeAdmin", t("usersManager.removeAdminFrom", { who }))}><ShieldMinus className="size-4" />{t("usersManager.removeAdmin")}</Button>
            : <Button size="sm" variant="outline" onClick={() => void act(u.id, "makeAdmin", t("usersManager.makeAnAdmin", { who }))}><ShieldPlus className="size-4" />{t("usersManager.makeAdmin")}</Button>}
          {u.disabled
            ? <Button size="sm" variant="outline" onClick={() => void act(u.id, "enable", t("usersManager.enableAgain", { who }))}><CheckCircle2 className="size-4" />{t("usersManager.enable")}</Button>
            : <Button size="sm" variant="outline" onClick={() => void act(u.id, "disable", t("usersManager.disableTheyCanNoLonger", { who }))}><Ban className="size-4" />{t("usersManager.disable")}</Button>}
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => void act(u.id, "delete", t("usersManager.permanentlyDeleteAndAllTheir", { who }))}><Trash2 className="size-4" />{t("common.delete")}</Button>
        </div>}
      </li>;
    })}</ul>
  </section>;
}

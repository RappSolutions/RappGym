import { useRef, useState } from "react";
import { ImageUp, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useLanguage } from "@/lib/i18n";
import { removeAvatar, uploadAvatar, useAvatarUrl } from "@/lib/avatar";

export function AvatarSettings({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const { data: user, refetch } = useQuery({
    queryKey: ["auth-user", userId],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  if (!user) return null;
  return <Inner user={user} onChange={() => void refetch()} t={t} />;
}

function Inner({
  user,
  onChange,
  t,
}: {
  user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>;
  onChange: () => void;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const url = useAvatarUrl(user);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasCustom = typeof user.user_metadata["custom_avatar"] === "number";
  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true);
    try {
      await fn();
      onChange();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex items-center gap-3" aria-label={t("avatar.picture")}>
      <Avatar className="size-14 shrink-0">
        {url && <AvatarImage src={url} alt="" />}
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs text-muted-foreground">{t("avatar.hint")}</p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="avatar-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 2 * 1024 * 1024) return void toast.error(t("avatar.tooLarge"));
              void run(() => uploadAvatar(user.id, f), t("avatar.saved"));
            }}
          />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
            {t("avatar.upload")}
          </Button>
          {hasCustom && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                if (await confirmDialog(t("avatar.removeConfirm")))
                  void run(() => removeAvatar(user.id));
              }}
            >
              <Trash2 className="size-4" />
              {t("avatar.remove")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

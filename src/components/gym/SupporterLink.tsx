import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { getBillingStatus } from "@/lib/billing.functions";

export const OPEN_ACCOUNT_EVENT = "rappgym:open-account";

/** Small link that opens the shared account dialog; hidden for supporters or when payments are off. */
export function SupporterLink({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  const status = useServerFn(getBillingStatus);
  const { data } = useQuery({ queryKey: ["billing-status", "link"], queryFn: () => status() });
  if (!data?.enabled || data.supporter) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ACCOUNT_EVENT))}
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline ${className}`}
    >
      <Heart className="size-3" />
      {t("account.becomeSupporter")}
    </button>
  );
}

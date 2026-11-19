import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";

type Req = { message: string; resolve: (ok: boolean) => void };
let push: ((r: Req) => void) | null = null;

/** App-wide replacement for window.confirm; resolves true when the user confirms. */
export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => (push ? push({ message, resolve }) : resolve(window.confirm(message))));
}

/** Mounted once in the root layout. */
export function ConfirmHost() {
  const { t } = useLanguage();
  const [req, setReq] = useState<Req | null>(null);
  useEffect(() => { push = setReq; return () => { push = null; }; }, []);
  const done = (ok: boolean) => { req?.resolve(ok); setReq(null); };
  return (
    <AlertDialog open={!!req} onOpenChange={(o) => { if (!o) done(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmHost.confirm")}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{req?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => done(false)}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => done(true)}>{t("confirmHost.ok")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { resolveExerciseTitle } from "@/lib/exercise-title.functions";
import { exerciseNameUrl } from "@/lib/exercise-title";
import { useLanguage } from "@/lib/i18n";

/** Scope requests to the current dialog/language; never replace a newer user edit. */
export function useExerciseTitle(open: boolean, scope: string) {
  const resolve = useServerFn(resolveExerciseTitle);
  const { t } = useLanguage();
  const generation = useRef(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => { generation.current++; setLoading(false); }, [open, scope]);
  function cancel() { generation.current++; setLoading(false); }
  async function lookup(value: string, apply: (title: string, url: string, description: string | null) => void) {
    const url = exerciseNameUrl(value);
    cancel();
    if (!url || !open) return;
    const token = generation.current;
    setLoading(true);
    try {
      const result = await resolve({ data: { url } });
      if (token !== generation.current) return;
      if (result.title) apply(result.title, url, result.description);
      else toast.error(t("exerciseForm.titleLookupFailed"));
    } catch { if (token === generation.current) toast.error(t("exerciseForm.titleLookupFailed")); }
    finally { if (token === generation.current) setLoading(false); }
  }
  return { loading, lookup, cancel };
}
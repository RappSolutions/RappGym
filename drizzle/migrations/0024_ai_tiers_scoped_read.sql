DROP POLICY IF EXISTS "signed in read" ON public.ai_tiers;
CREATE POLICY "own tier or admin read" ON public.ai_tiers FOR SELECT TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.user_ai_quotas q WHERE q.tier_id = ai_tiers.id AND q.user_id = (SELECT auth.uid()))
  OR (is_default AND NOT EXISTS (SELECT 1 FROM public.user_ai_quotas q WHERE q.user_id = (SELECT auth.uid())))
);
CREATE TABLE public.ai_tiers (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]*$'),
  name text NOT NULL,
  monthly_ai_quota integer CHECK (monthly_ai_quota IS NULL OR monthly_ai_quota >= 0),
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ai_tiers_one_default ON public.ai_tiers (is_default) WHERE is_default;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tiers TO authenticated;
GRANT ALL ON public.ai_tiers TO service_role;
ALTER TABLE public.ai_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read" ON public.ai_tiers FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "admin insert" ON public.ai_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update" ON public.ai_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.ai_tiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.ai_tiers (id, name, monthly_ai_quota, is_default, sort_order) VALUES
  ('free', 'Free', 10, true, 0),
  ('supporter', 'Supporter', NULL, false, 1);

CREATE TABLE public.user_ai_quotas (
  user_id uuid PRIMARY KEY,
  tier_id text NOT NULL REFERENCES public.ai_tiers(id) ON DELETE RESTRICT,
  custom_quota integer CHECK (custom_quota IS NULL OR custom_quota >= 0),
  is_blocked boolean NOT NULL DEFAULT false,
  valid_until date,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_quotas TO authenticated;
GRANT ALL ON public.user_ai_quotas TO service_role;
ALTER TABLE public.user_ai_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.user_ai_quotas FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert" ON public.user_ai_quotas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update" ON public.user_ai_quotas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.user_ai_quotas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS training_ai_history_user_generated_idx ON public.training_ai_history (user_id, generated_at);

CREATE OR REPLACE FUNCTION public.ai_quota_status(_user_id uuid)
RETURNS TABLE (tier_id text, tier_name text, quota integer, used integer, is_blocked boolean, is_admin boolean, source text, period_start date, period_end date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  _q public.user_ai_quotas%ROWTYPE;
  _t public.ai_tiers%ROWTYPE;
  _admin boolean := public.has_role(_user_id, 'admin');
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT * INTO _q FROM public.user_ai_quotas q WHERE q.user_id = _user_id AND (q.valid_until IS NULL OR q.valid_until >= (now() AT TIME ZONE 'UTC')::date);
  IF FOUND THEN SELECT * INTO _t FROM public.ai_tiers WHERE id = _q.tier_id;
  ELSE SELECT * INTO _t FROM public.ai_tiers WHERE ai_tiers.is_default LIMIT 1; END IF;
  RETURN QUERY SELECT
    _t.id, _t.name,
    CASE WHEN _admin THEN NULL WHEN COALESCE(_q.is_blocked, false) THEN 0 WHEN _q.custom_quota IS NOT NULL THEN _q.custom_quota ELSE _t.monthly_ai_quota END,
    (SELECT count(*)::int FROM public.training_ai_history h WHERE h.user_id = _user_id AND h.generated_at >= _start),
    COALESCE(_q.is_blocked, false), _admin,
    CASE WHEN _admin THEN 'admin' WHEN COALESCE(_q.is_blocked, false) THEN 'blocked' WHEN _q.custom_quota IS NOT NULL THEN 'custom' ELSE 'tier' END,
    _start::date, (_start + interval '1 month')::date;
END $$;
REVOKE ALL ON FUNCTION public.ai_quota_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_quota_status(uuid) TO authenticated;
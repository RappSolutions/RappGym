CREATE TABLE public.admin_user_views (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 auth_session_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 target_user_id uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 CONSTRAINT different_view_user CHECK (actor_id <> target_user_id)
);
GRANT SELECT ON public.admin_user_views TO authenticated;
GRANT ALL ON public.admin_user_views TO service_role;
ALTER TABLE public.admin_user_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actor reads audit" ON public.admin_user_views FOR SELECT TO authenticated USING (actor_id = (SELECT auth.uid()));
CREATE UNIQUE INDEX one_active_user_view_per_session ON public.admin_user_views(auth_session_id) WHERE ended_at IS NULL;
CREATE INDEX admin_user_views_actor ON public.admin_user_views(actor_id);
CREATE FUNCTION public.user_view_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.admin_user_views v WHERE v.actor_id = auth.uid() AND v.auth_session_id = nullif(auth.jwt()->>'session_id','')::uuid AND v.ended_at IS NULL)
$$;
CREATE FUNCTION public.effective_user_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce((SELECT v.target_user_id FROM public.admin_user_views v WHERE v.actor_id = auth.uid() AND v.auth_session_id = nullif(auth.jwt()->>'session_id','')::uuid AND v.ended_at IS NULL AND public.has_role(auth.uid(),'admin') AND NOT public.has_role(v.target_user_id,'admin') AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v.target_user_id)), auth.uid())
$$;
CREATE FUNCTION public.start_user_view(_target_user_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _session uuid := nullif(auth.jwt()->>'session_id','')::uuid; _id uuid;
BEGIN
 IF auth.uid() IS NULL OR _session IS NULL OR NOT public.has_role(auth.uid(),'admin') OR _target_user_id=auth.uid() OR public.has_role(_target_user_id,'admin') OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id=_target_user_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.admin_user_views SET ended_at=now() WHERE actor_id=auth.uid() AND auth_session_id=_session AND ended_at IS NULL;
 INSERT INTO public.admin_user_views(auth_session_id,actor_id,target_user_id) VALUES (_session,auth.uid(),_target_user_id) RETURNING id INTO _id;
 RETURN _id;
END $$;
CREATE FUNCTION public.end_user_view() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 UPDATE public.admin_user_views SET ended_at=now() WHERE actor_id=auth.uid() AND auth_session_id=nullif(auth.jwt()->>'session_id','')::uuid AND ended_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.user_view_active(), public.effective_user_id(), public.start_user_view(uuid), public.end_user_view() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_view_active(), public.effective_user_id(), public.start_user_view(uuid), public.end_user_view() TO authenticated, service_role;
ALTER POLICY "own select" ON public.log_entries USING (user_id=(SELECT public.effective_user_id()));
ALTER POLICY "own select" ON public.workouts USING (user_id=(SELECT public.effective_user_id()));
ALTER POLICY "own select" ON public.training_profiles USING (user_id=(SELECT public.effective_user_id()));
ALTER POLICY "own select" ON public.training_goals USING (user_id=(SELECT public.effective_user_id()));
ALTER POLICY "own select" ON public.training_ai_history USING (user_id=(SELECT public.effective_user_id()));
ALTER POLICY "public owner or admin read" ON public.gyms USING (is_public OR user_id=(SELECT public.effective_user_id()) OR (NOT (SELECT public.user_view_active()) AND public.has_role((SELECT auth.uid()),'admin')));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['log_entries','workouts','training_profiles','training_goals','training_ai_history','exercises','exercise_categories','exercise_equipment','exercise_locations','gyms','user_ai_quotas','ai_tiers','user_roles'] LOOP
  EXECUTE format('CREATE POLICY "user view blocks insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (SELECT public.user_view_active()))',t);
  EXECUTE format('CREATE POLICY "user view blocks update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (SELECT public.user_view_active())) WITH CHECK (NOT (SELECT public.user_view_active()))',t);
  EXECUTE format('CREATE POLICY "user view blocks delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT (SELECT public.user_view_active()))',t);
 END LOOP;
END $$;
COMMENT ON TABLE public.admin_user_views IS 'Session-scoped read-only support audit. Actor identity never changes. Future write capabilities require explicit authorization and per-operation auditing; no target writes are currently authorized.';
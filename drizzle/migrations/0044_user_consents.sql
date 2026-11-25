CREATE TABLE public.user_consents (
  user_id uuid NOT NULL,
  terms_version integer NOT NULL CHECK (terms_version > 0),
  consented_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, terms_version)
);
GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON public.user_consents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own insert" ON public.user_consents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT public.user_view_active());
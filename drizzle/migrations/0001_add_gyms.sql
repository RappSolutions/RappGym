CREATE TABLE public.gyms (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text not null default '',
 created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT ALL ON public.gyms TO service_role;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read gyms" ON public.gyms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert gyms" ON public.gyms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update gyms" ON public.gyms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete gyms" ON public.gyms FOR DELETE TO authenticated USING (true);
INSERT INTO public.gyms (id, name, description) VALUES ('00000000-0000-0000-0000-000000000001', 'Hemmagym', 'Gymstick HomeGym 3.0, hantlar, skivstång, band och matta');
ALTER TABLE public.exercises ADD COLUMN gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;
UPDATE public.exercises SET gym_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.log_entries ADD COLUMN gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;
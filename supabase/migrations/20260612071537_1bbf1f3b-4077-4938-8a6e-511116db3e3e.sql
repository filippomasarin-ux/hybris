
-- Coach AI messages (single conversation per user, persisted)
CREATE TABLE public.coach_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  parts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own coach messages" ON public.coach_messages
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX coach_messages_user_created_idx ON public.coach_messages(user_id, created_at);

-- Clubs
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descrizione TEXT,
  codice_invito TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clubs TO authenticated;
GRANT ALL ON public.clubs TO service_role;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Club members
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ruolo TEXT NOT NULL DEFAULT 'atleta' CHECK (ruolo IN ('captain','atleta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id);
$$;

CREATE OR REPLACE FUNCTION public.is_club_captain(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = _user_id AND club_id = _club_id AND ruolo = 'captain');
$$;

-- Clubs policies: authenticated can lookup any club (for joining by code is done via codice_invito); captain can update
CREATE POLICY "anyone authed can read clubs" ON public.clubs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authed can create club" ON public.clubs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "captain can update club" ON public.clubs
  FOR UPDATE TO authenticated USING (public.is_club_captain(auth.uid(), id)) WITH CHECK (public.is_club_captain(auth.uid(), id));
CREATE POLICY "captain can delete club" ON public.clubs
  FOR DELETE TO authenticated USING (public.is_club_captain(auth.uid(), id));

-- Members policies
CREATE POLICY "members can view co-members" ON public.club_members
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid(), club_id) OR user_id = auth.uid());
CREATE POLICY "user can join club" ON public.club_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user can leave or captain manages" ON public.club_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_club_captain(auth.uid(), club_id));

-- Announcements
CREATE TABLE public.club_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  titolo TEXT,
  contenuto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_announcements TO authenticated;
GRANT ALL ON public.club_announcements TO service_role;
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members can read announcements" ON public.club_announcements
  FOR SELECT TO authenticated USING (public.is_club_member(auth.uid(), club_id));
CREATE POLICY "captain can post announcements" ON public.club_announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_club_captain(auth.uid(), club_id) AND auth.uid() = author_id);
CREATE POLICY "captain can delete announcements" ON public.club_announcements
  FOR DELETE TO authenticated USING (public.is_club_captain(auth.uid(), club_id));
CREATE INDEX club_announcements_club_idx ON public.club_announcements(club_id, created_at DESC);

-- Updated-at trigger for clubs
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER clubs_touch BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

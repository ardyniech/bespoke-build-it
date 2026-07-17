
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('super_admin','admin','bendahara','satgas','anggota');
CREATE TYPE public.jenjang_anggota AS ENUM ('calon','muda','madya','purna');
CREATE TYPE public.status_anggota AS ENUM ('aktif','nonaktif','cuti');
CREATE TYPE public.kas_ledger AS ENUM ('umum','sosial');
CREATE TYPE public.kas_jenis AS ENUM ('masuk','keluar');
CREATE TYPE public.kejadian_tipe AS ENUM ('sos','laka','mogok','lain');
CREATE TYPE public.kejadian_status AS ENUM ('open','on_progress','closed');

-- ============= UPDATED_AT TRIGGER =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '',
  no_hp TEXT,
  alamat TEXT,
  foto_url TEXT,
  jenjang public.jenjang_anggota NOT NULL DEFAULT 'calon',
  status public.status_anggota NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============= PROFILE POLICIES =============
CREATE POLICY "Anggota bisa lihat semua profil"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "User update profil sendiri"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin update semua profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============= USER_ROLES POLICIES =============
CREATE POLICY "User lihat role sendiri"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin lihat semua role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admin kelola role"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ============= AUTO CREATE PROFILE ON SIGNUP =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'anggota');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= KAS TRANSACTIONS =============
CREATE TABLE public.kas_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger public.kas_ledger NOT NULL,
  jenis public.kas_jenis NOT NULL,
  jumlah NUMERIC(14,2) NOT NULL CHECK (jumlah > 0),
  kategori TEXT NOT NULL DEFAULT 'umum',
  deskripsi TEXT,
  bukti_path TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kas_transactions TO authenticated;
GRANT ALL ON public.kas_transactions TO service_role;
ALTER TABLE public.kas_transactions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_kas_updated_at BEFORE UPDATE ON public.kas_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anggota lihat kas"
  ON public.kas_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Bendahara/admin insert kas"
  ON public.kas_transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'bendahara') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "Bendahara/admin update kas"
  ON public.kas_transactions FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'bendahara') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "Admin hapus kas"
  ON public.kas_transactions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============= KEJADIAN =============
CREATE TABLE public.kejadian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe public.kejadian_tipe NOT NULL DEFAULT 'sos',
  pelapor_id UUID NOT NULL REFERENCES auth.users(id),
  lokasi_lat DOUBLE PRECISION,
  lokasi_lng DOUBLE PRECISION,
  alamat_text TEXT,
  deskripsi TEXT,
  status public.kejadian_status NOT NULL DEFAULT 'open',
  dibuat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ditutup_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kejadian TO authenticated;
GRANT ALL ON public.kejadian TO service_role;
ALTER TABLE public.kejadian ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_kejadian_updated_at BEFORE UPDATE ON public.kejadian
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anggota lihat kejadian"
  ON public.kejadian FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anggota lapor kejadian"
  ON public.kejadian FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = pelapor_id);
CREATE POLICY "Pelapor & satgas update kejadian"
  ON public.kejadian FOR UPDATE TO authenticated
  USING (
    auth.uid() = pelapor_id OR
    public.has_role(auth.uid(),'satgas') OR
    public.has_role(auth.uid(),'admin') OR
    public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "Admin hapus kejadian"
  ON public.kejadian FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ============= KEJADIAN RESPONDERS =============
CREATE TABLE public.kejadian_responders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kejadian_id UUID NOT NULL REFERENCES public.kejadian(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kejadian_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.kejadian_responders TO authenticated;
GRANT ALL ON public.kejadian_responders TO service_role;
ALTER TABLE public.kejadian_responders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anggota lihat responder"
  ON public.kejadian_responders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Satgas gabung sebagai responder"
  ON public.kejadian_responders FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      public.has_role(auth.uid(),'satgas') OR
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'super_admin')
    )
  );
CREATE POLICY "Responder keluar sendiri"
  ON public.kejadian_responders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============= REALTIME =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.kejadian;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kejadian_responders;

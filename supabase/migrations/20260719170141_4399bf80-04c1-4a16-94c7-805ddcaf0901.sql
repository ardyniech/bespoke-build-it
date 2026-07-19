
-- =========================================
-- SCREENING (Kaderisasi)
-- =========================================
CREATE TYPE public.screening_status AS ENUM ('menunggu','wawancara','direkomendasikan','ditolak');

CREATE TABLE public.screening_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  urutan int NOT NULL DEFAULT 0,
  pertanyaan text NOT NULL,
  tipe text NOT NULL DEFAULT 'text', -- text|choice|scale
  opsi jsonb,             -- [{label, bobot}] untuk choice/scale
  bobot_max numeric NOT NULL DEFAULT 0, -- rahasia
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_questions TO authenticated;
GRANT ALL ON public.screening_questions TO service_role;
ALTER TABLE public.screening_questions ENABLE ROW LEVEL SECURITY;

-- Public form perlu label pertanyaan (tanpa bobot). Kita expose via view + RPC saja.
-- Untuk simpel: policy anon SELECT hanya saat aktif — bobot tetap ada di kolom tapi
-- di layer aplikasi kita hindari SELECT bobot untuk anon. Karena PostgREST tidak
-- filter kolom by role, kita batasi anon lewat security definer function saja.
CREATE POLICY "kader admin manage questions" ON public.screening_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "auth read questions minus weight" ON public.screening_questions
  FOR SELECT TO authenticated USING (aktif = true);

CREATE TABLE public.screening_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  no_hp text NOT NULL,
  email text,
  alamat text,
  kota text,
  motivasi text,
  status public.screening_status NOT NULL DEFAULT 'menunggu',
  skor_total numeric,      -- diisi trigger/RPC saat submit
  catatan_pic text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_applications TO authenticated;
GRANT INSERT ON public.screening_applications TO anon;
GRANT ALL ON public.screening_applications TO service_role;
ALTER TABLE public.screening_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon submit application" ON public.screening_applications
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth submit application" ON public.screening_applications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kader read applications" ON public.screening_applications
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "kader update applications" ON public.screening_applications
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  );

CREATE TABLE public.screening_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.screening_applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.screening_questions(id) ON DELETE CASCADE,
  jawaban text,
  bobot_didapat numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_answers TO authenticated;
GRANT INSERT ON public.screening_answers TO anon;
GRANT ALL ON public.screening_answers TO service_role;
ALTER TABLE public.screening_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert answer" ON public.screening_answers
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth insert answer" ON public.screening_answers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kader read answers" ON public.screening_answers
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  );

CREATE TRIGGER trg_screening_apps_updated
  BEFORE UPDATE ON public.screening_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_screening_q_updated
  BEFORE UPDATE ON public.screening_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View publik: pertanyaan tanpa bobot
CREATE OR REPLACE VIEW public.screening_questions_public AS
  SELECT id, urutan, pertanyaan, tipe,
    -- strip 'bobot' from opsi
    CASE
      WHEN opsi IS NULL THEN NULL
      ELSE (
        SELECT jsonb_agg(jsonb_build_object('label', o->>'label') ORDER BY ord)
        FROM jsonb_array_elements(opsi) WITH ORDINALITY AS t(o, ord)
      )
    END AS opsi
  FROM public.screening_questions
  WHERE aktif = true
  ORDER BY urutan;
GRANT SELECT ON public.screening_questions_public TO anon, authenticated;

-- =========================================
-- PIKET SCHEDULER
-- =========================================
CREATE TYPE public.piket_shift_slot AS ENUM ('pagi','siang','malam');

CREATE TABLE public.piket_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  slot public.piket_shift_slot NOT NULL,
  wilayah text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catatan text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tanggal, slot, wilayah, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.piket_shifts TO authenticated;
GRANT ALL ON public.piket_shifts TO service_role;
ALTER TABLE public.piket_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all auth read piket" ON public.piket_shifts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage piket" ON public.piket_shifts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_piket_updated
  BEFORE UPDATE ON public.piket_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- WEB PUSH SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user manage own push" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_push_updated
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed beberapa pertanyaan screening default
INSERT INTO public.screening_questions (urutan, pertanyaan, tipe, opsi, bobot_max) VALUES
(1,'Sudah berapa lama Anda mengemudi profesional?','choice',
  '[{"label":"< 1 tahun","bobot":1},{"label":"1-3 tahun","bobot":2},{"label":"3-5 tahun","bobot":3},{"label":"> 5 tahun","bobot":4}]'::jsonb, 4),
(2,'Apakah Anda memiliki SIM aktif sesuai kendaraan?','choice',
  '[{"label":"Ya","bobot":3},{"label":"Tidak","bobot":0}]'::jsonb, 3),
(3,'Kesediaan hadir kegiatan komunitas per bulan','scale',
  '[{"label":"1x","bobot":1},{"label":"2x","bobot":2},{"label":"3x","bobot":3},{"label":"4x atau lebih","bobot":4}]'::jsonb, 4),
(4,'Motivasi bergabung dengan DRG','text', NULL, 3);

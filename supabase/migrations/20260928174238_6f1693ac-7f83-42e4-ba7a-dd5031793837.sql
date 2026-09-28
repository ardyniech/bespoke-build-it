CREATE TABLE public.jenjang_riwayat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dari public.jenjang_anggota,
  ke public.jenjang_anggota NOT NULL,
  catatan text,
  evaluator_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jenjang_riwayat TO authenticated;
GRANT ALL ON public.jenjang_riwayat TO service_role;
ALTER TABLE public.jenjang_riwayat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staf atau pemilik lihat riwayat jenjang" ON public.jenjang_riwayat
FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE INDEX idx_jenjang_riwayat_user ON public.jenjang_riwayat(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_jenjang_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.jenjang IS DISTINCT FROM OLD.jenjang THEN
    INSERT INTO public.jenjang_riwayat(user_id, dari, ke, catatan, evaluator_id)
    VALUES (NEW.id, OLD.jenjang, NEW.jenjang,
      NULLIF(current_setting('drg.jenjang_catatan', true), ''), auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_jenjang_change() FROM anon, authenticated, public;
CREATE TRIGGER trg_log_jenjang_change AFTER UPDATE OF jenjang ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_jenjang_change();

CREATE OR REPLACE FUNCTION public.ubah_jenjang(_user_id uuid, _ke public.jenjang_anggota, _catatan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Hanya staf yang boleh mengubah jenjang';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Tidak boleh mengubah jenjang sendiri';
  END IF;
  PERFORM set_config('drg.jenjang_catatan', left(coalesce(_catatan,''), 1000), true);
  UPDATE public.profiles SET jenjang = _ke WHERE id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Anggota tidak ditemukan'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.ubah_jenjang(uuid, public.jenjang_anggota, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ubah_jenjang(uuid, public.jenjang_anggota, text) TO authenticated;
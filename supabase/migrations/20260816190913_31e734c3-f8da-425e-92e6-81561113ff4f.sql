CREATE TABLE public.laporan_etik (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelapor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  anonim boolean NOT NULL DEFAULT false,
  terlapor_nama text NOT NULL,
  isi_laporan text NOT NULL,
  status text NOT NULL DEFAULT 'diterima' CHECK (status IN ('diterima','diproses','selesai')),
  catatan_penanganan text,
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.laporan_etik TO authenticated;
GRANT ALL ON public.laporan_etik TO service_role;

ALTER TABLE public.laporan_etik ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_dewan_etik(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'dewan_etik')
      OR public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'super_admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_dewan_etik(uuid) FROM anon;

CREATE POLICY "Anggota aktif buat laporan etik"
ON public.laporan_etik FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_member(auth.uid())
  AND status = 'diterima'
  AND catatan_penanganan IS NULL
  AND handled_by IS NULL
  AND ((anonim = true AND pelapor_id IS NULL) OR (anonim = false AND pelapor_id = auth.uid()))
);

CREATE POLICY "Dewan etik lihat semua laporan"
ON public.laporan_etik FOR SELECT TO authenticated
USING (public.is_dewan_etik(auth.uid()));

CREATE POLICY "Pelapor lihat laporan sendiri"
ON public.laporan_etik FOR SELECT TO authenticated
USING (anonim = false AND pelapor_id = auth.uid());

CREATE POLICY "Dewan etik kelola laporan"
ON public.laporan_etik FOR UPDATE TO authenticated
USING (public.is_dewan_etik(auth.uid()))
WITH CHECK (public.is_dewan_etik(auth.uid()));

CREATE TRIGGER trg_laporan_etik_updated
BEFORE UPDATE ON public.laporan_etik
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.cek_status_laporan_etik(_token uuid)
RETURNS TABLE(status text, catatan_penanganan text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.status, l.catatan_penanganan, l.created_at, l.updated_at
  FROM public.laporan_etik l
  WHERE l.access_token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.cek_status_laporan_etik(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cek_status_laporan_etik(uuid) TO authenticated;
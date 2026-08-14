CREATE TABLE public.inventaris_barang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  jumlah integer NOT NULL DEFAULT 0,
  kondisi text NOT NULL DEFAULT 'Baik',
  lokasi_simpan text NOT NULL DEFAULT '-',
  catatan text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventaris_barang TO authenticated;
GRANT ALL ON public.inventaris_barang TO service_role;
ALTER TABLE public.inventaris_barang ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anggota aktif lihat barang" ON public.inventaris_barang
FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));

CREATE POLICY "Admin kelola barang" ON public.inventaris_barang
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_inventaris_barang_updated
BEFORE UPDATE ON public.inventaris_barang
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventaris_mutasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_id uuid NOT NULL REFERENCES public.inventaris_barang(id) ON DELETE CASCADE,
  jenis text NOT NULL CHECK (jenis IN ('masuk','keluar','penyesuaian')),
  jumlah_perubahan integer NOT NULL,
  keterangan text,
  actor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inventaris_mutasi TO authenticated;
GRANT ALL ON public.inventaris_mutasi TO service_role;
ALTER TABLE public.inventaris_mutasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anggota aktif lihat mutasi" ON public.inventaris_mutasi
FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));

CREATE POLICY "Admin catat mutasi" ON public.inventaris_mutasi
FOR INSERT TO authenticated
WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) AND actor_id = auth.uid());

CREATE INDEX idx_inventaris_mutasi_barang ON public.inventaris_mutasi(barang_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_inventaris_mutasi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer;
  hasil integer;
BEGIN
  IF NEW.jenis = 'keluar' THEN
    delta := -abs(NEW.jumlah_perubahan);
  ELSIF NEW.jenis = 'masuk' THEN
    delta := abs(NEW.jumlah_perubahan);
  ELSE
    delta := NEW.jumlah_perubahan;
  END IF;

  NEW.jumlah_perubahan := delta;

  SELECT jumlah + delta INTO hasil FROM public.inventaris_barang WHERE id = NEW.barang_id FOR UPDATE;
  IF hasil IS NULL THEN
    RAISE EXCEPTION 'Barang tidak ditemukan';
  END IF;
  IF hasil < 0 THEN
    RAISE EXCEPTION 'Stok tidak mencukupi: hasil akhir akan menjadi %', hasil;
  END IF;

  UPDATE public.inventaris_barang SET jumlah = hasil WHERE id = NEW.barang_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inventaris_mutasi
BEFORE INSERT ON public.inventaris_mutasi
FOR EACH ROW EXECUTE FUNCTION public.apply_inventaris_mutasi();
CREATE TABLE public.notulen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  jenis_rapat text NOT NULL,
  pemimpin_rapat text NOT NULL,
  notulis text NOT NULL,
  poin_poin jsonb NOT NULL DEFAULT '[]'::jsonb,
  catatan_tambahan text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notulen TO authenticated;
GRANT ALL ON public.notulen TO service_role;

ALTER TABLE public.notulen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anggota aktif dan staf baca notulen"
ON public.notulen FOR SELECT TO authenticated
USING (public.is_active_member(auth.uid()) OR public.is_staff(auth.uid()));

CREATE POLICY "Admin atau anggota aktif buat notulen"
ON public.notulen FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (public.is_active_member(auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
);

CREATE POLICY "Pembuat atau admin ubah notulen"
ON public.notulen FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Pembuat atau admin hapus notulen"
ON public.notulen FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_notulen_updated_at
BEFORE UPDATE ON public.notulen
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_notulen_tanggal ON public.notulen (tanggal DESC);
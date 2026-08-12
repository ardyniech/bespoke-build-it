DROP POLICY IF EXISTS "Anggota lihat bukti kas" ON storage.objects;

CREATE POLICY "Bukti kas hanya staf atau pembuat transaksi"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bukti-kas'
  AND (
    public.has_role(auth.uid(), 'bendahara')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.kas_transactions t
      WHERE t.bukti_path = storage.objects.name
        AND t.created_by = auth.uid()
    )
  )
);
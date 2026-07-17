
-- bukti-kas
CREATE POLICY "Anggota lihat bukti kas"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bukti-kas');
CREATE POLICY "Bendahara/admin unggah bukti kas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bukti-kas' AND (
      public.has_role(auth.uid(),'bendahara') OR
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'super_admin')
    )
  );
CREATE POLICY "Bendahara/admin hapus bukti kas"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bukti-kas' AND (
      public.has_role(auth.uid(),'bendahara') OR
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'super_admin')
    )
  );

-- avatars: file di folder <user_id>/...
CREATE POLICY "Anggota lihat avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "User kelola avatar sendiri"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "User update avatar sendiri"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "User hapus avatar sendiri"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

# Fase 2 — Backend + 3 Modul Inti

Aktifkan Lovable Cloud lalu bangun Auth, Anggota, Kas, dan SOS/Kejadian secara berurutan agar setiap modul bisa diverifikasi sebelum lanjut.

## Langkah 1 — Aktifkan Cloud & Auth Shell
- Enable Lovable Cloud (Postgres + Auth + Storage).
- Konfigurasi Auth: email/password + Google sign-in (default Lovable).
- Buat route publik `/auth` (login + signup) dan `/reset-password`.
- Pindahkan semua route aplikasi ke bawah `_authenticated/` (kecuali `/`, `/auth`, `/reset-password`, `/etik` noindex). Landing `/` jadi halaman publik dengan CTA "Masuk".
- Header shell: tampilkan nama user + tombol logout ketika signed-in.

## Langkah 2 — Skema Database (satu migrasi)
Semua tabel di `public` + GRANT + RLS + policies. Ringkas:

- `profiles` (id → auth.users, nama, no_hp, alamat, foto_url, jenjang, status) — auto-insert via trigger `handle_new_user`.
- `app_role` enum: `super_admin | admin | bendahara | satgas | anggota`.
- `user_roles` (user_id, role) + fungsi `has_role(uuid, app_role)` SECURITY DEFINER.
- `kas_ledger` enum: `umum | sosial`.
- `kas_transactions` (ledger, jenis in/out, jumlah, kategori, deskripsi, bukti_url, created_by, tanggal).
- `kejadian` (tipe: sos/laka/mogok/lain, pelapor_id, lokasi_lat, lokasi_lng, alamat_text, deskripsi, status: open/on_progress/closed, dibuat_at, ditutup_at).
- `kejadian_responders` (kejadian_id, user_id, joined_at) — Satgas yang merespon.
- Storage bucket privat `bukti-kas` + bucket `avatars` (publik).

RLS singkat:
- `profiles`: user baca/update dirinya; admin baca semua.
- `user_roles`: user baca miliknya; hanya super_admin bisa insert/update/delete.
- `kas_transactions`: semua anggota SELECT; hanya bendahara/admin INSERT/UPDATE/DELETE.
- `kejadian`: semua anggota SELECT; pelapor & satgas UPDATE status; INSERT untuk authenticated.
- `kejadian_responders`: satgas INSERT diri sendiri; semua anggota SELECT.

## Langkah 3 — Modul Anggota
- Halaman `/anggota` daftar profil (search, filter jenjang/status, paginate).
- Detail `/anggota/$id` (read-only kecuali admin).
- Form edit profil sendiri di `/profil`.
- Assign role (admin only) via dialog.
- Server fn: `listAnggota`, `getAnggota`, `updateProfile`, `assignRole`.

## Langkah 4 — Modul Kas & Keuangan
- Halaman `/kas` dengan tab **Umum** / **Sosial**, kartu saldo real-time (SUM masuk − keluar).
- Tabel transaksi + filter tanggal/kategori.
- Dialog "Tambah Transaksi" (bendahara/admin): jenis, jumlah, kategori, deskripsi, upload bukti ke `bukti-kas`.
- Signed URL untuk lihat bukti.
- Server fn: `listTransaksi(ledger)`, `saldoKas(ledger)`, `createTransaksi`, `deleteTransaksi`.

## Langkah 5 — Modul SOS & Kejadian
- Tombol SOS di header: dialog konfirmasi → ambil geolocation → insert `kejadian` tipe `sos` status `open`.
- Halaman `/kejadian`: list realtime (Supabase Realtime channel) + badge status.
- Detail `/kejadian/$id`: peta lokasi (Leaflet lazy, `<ClientOnly>`), daftar responder, tombol "Saya Merespon" (insert `kejadian_responders`), tombol "Tutup Kejadian" (pelapor/admin).
- Server fn: `createKejadian`, `listKejadian`, `respondKejadian`, `closeKejadian`.
- Notifikasi in-app via `sonner` toast saat kejadian baru masuk (subscribe realtime di root layout untuk role satgas/admin).

## Verifikasi tiap langkah
Setelah tiap langkah: cek build, buat 1 user demo via signup, test happy path modul, baru lanjut.

## Catatan teknis
- Semua server fn pakai `createServerFn` + `requireSupabaseAuth`, admin check via `has_role`.
- Storage bucket dibuat via tool, RLS via migrasi.
- Route protected di bawah `_authenticated/` (managed layout), landing `/` tetap publik.
- Peta pakai Leaflet + OSM (sudah disepakati, tanpa Google/Mapbox).

Approve untuk mulai Langkah 1?

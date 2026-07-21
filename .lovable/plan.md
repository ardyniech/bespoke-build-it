## Fokus turn ini

Cakupan besar (4 modul). Saya kerjakan berurutan dalam 1 turn — kalau ada modul yang butuh iterasi lebih dalam, kita lanjut di turn berikutnya.

### 0. Bug — Nama user di header/menu

`UserMenu` hanya baca `user_metadata.full_name/name` (Google OAuth), tapi signup email/password menyimpan `nama` di `profiles`. Fix: fetch `profiles.nama` sebagai sumber utama, fallback ke `user_metadata.nama` → `full_name` → prefix email. Sinkron ulang saat profil di-update (invalidate query `me-name`).

### 1. Peta live — Leaflet asli

- Install `leaflet` + `react-leaflet` + `@types/leaflet`.
- Load CSS Leaflet via `<link>` di `__root.tsx` (jangan `@import` di `styles.css`).
- Komponen `LiveMap.tsx` dynamic-import via `React.lazy` + `<ClientOnly>` supaya SSR/prerender aman.
- OSM tile layer, marker berbeda untuk "Anda" (accent) vs rekan (primary) vs off (muted), popup: nama, waktu update, koordinat, tombol "Buka di Google Maps".
- Auto-fit `bounds` ke semua marker On-Bit, tombol "Fokus ke saya".
- Filter: tampilkan hanya On-Bit / semua (termasuk offline < 30 mnt).

### 2. Kejadian/SOS — detail, join, tutup

- Halaman detail `/_authenticated/kejadian/$id`: deskripsi, peta mini (reuse LiveMap 1 marker), daftar responder (join `kejadian_responders` + `profiles`), timeline dari `dibuat_at` / responder joined_at / ditutup_at.
- Aksi kontekstual: "Saya respons" (idempoten), "Batal respons", "Tutup insiden" (hanya pelapor/admin/satgas), tombol "Rute Google Maps" & "Telepon pelapor" jika ada HP.
- Realtime subscribe channel per id (kejadian + responders).
- Fix `dibuat_at` field name check + tambah kolom `ditutup_at` jika belum ada (cek dulu via migration diff).
- Kartu di list: link ke detail, badge jumlah responder.

### 3. Kas — approval tiering + filter periode + export

Migration: tambah kolom di `kas_transactions`:
- `status` enum `kas_status`: `draft|menunggu|disetujui|ditolak` (default `disetujui` untuk backward-compat pada tier Hijau).
- `approved_by uuid`, `approved_at timestamptz`, `catatan_approver text`.

Rule tier → butuh approval:
- Hijau (<500rb) → auto `disetujui`.
- Kuning (500rb–2jt) → butuh `bendahara`.
- Oranye (2jt–5jt) → butuh `admin`.
- Merah (≥5jt) → butuh `super_admin`.

Trigger DB `trg_kas_default_status` untuk set status awal berdasarkan tier saat insert. Saldo dihitung hanya dari `status = 'disetujui'`.

UI:
- Filter: rentang tanggal (default bulan berjalan), ledger, status, kategori, search deskripsi.
- Ringkasan periode: total masuk / keluar / net / saldo kumulatif; badge "menunggu approval" (dengan jumlah).
- Tabel: kolom status, tombol Approve/Tolak untuk role sesuai.
- Export CSV (BOM UTF-8) dari data terfilter.

### 4. Piket — auto-assign, notifikasi shift, tukar jadwal

Migration: tabel `piket_swap_requests` (`shift_id`, `requested_by`, `target_user_id`, `status: pending|accepted|declined|cancelled`, `alasan`), plus RLS (pemilik shift boleh request; target boleh accept/decline; admin lihat semua).

Fitur:
- Auto-assign: dialog "Buat jadwal 1 pekan" — pilih daftar Satgas + wilayah, algoritme round-robin isi slot kosong per hari (tiap orang max 1 shift/hari). Preview → confirm → batch insert.
- Notifikasi push H-1: server fn `notifyPiketReminders` — dipicu manual dari tombol "Kirim pengingat besok" (skip pg_cron dulu; ringkas dulu). Kirim push ke owner shift H-1 yang punya `notif_pengumuman = true`.
- Tukar jadwal: tombol "Ajukan tukar" pada shift milik user → pilih rekan target → request. Rekan target lihat inbox tukar di halaman piket (card di atas kalender). Accept → swap `user_id`. Decline → tandai.

### Constraints & lingkup

- Semua UI Bahasa Indonesia, ikut design system (warm terracotta, jangan hardcode warna).
- Migration DB pakai tool migrasi (1 batch untuk kas + 1 untuk piket_swap + 1 kolom `ditutup_at` jika perlu).
- Route baru: `/_authenticated/kejadian/$id`, plus komponen shared `LiveMap`.
- Verifikasi build + typecheck di akhir; kalau ada modul yang terlalu berat dalam 1 turn, saya potong (Peta + Kejadian + bug user-menu wajib jalan; Kas & Piket kalau menyentuh limit akan saya push di turn berikut dengan status jelas).

Approve untuk mulai eksekusi?
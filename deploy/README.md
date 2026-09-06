# Panduan Deployment & Fine-Tuning Server Laptop Sony Vaio (Ubuntu Server CLI)

Dokumentasi ini dirancang khusus untuk menjalankan aplikasi DRG di laptop Sony Vaio tua yang difungsikan sebagai server Ubuntu Server CLI agar **berjalan sangat halus (smooth), hemat RAM (2GB-4GB cukup), suhu tidak panas, dan kipas hening**.

---

## 1. Karakteristik & Solusi untuk Laptop Sony Vaio Tua

| Tantangan Laptop Tua | Dampak Buruk | Solusi yang Diterapkan di Aplikasi Ini |
|---|---|---|
| Layar ditutup (Closed Lid) | Ubuntu default otomatis tidur (suspend/sleep) dan jaringan mati | Skrip `vaio-optimizer.sh` otomatis menyetel `HandleLidSwitch=ignore` |
| RAM Terbatas (2GB – 4GB) | Disk-thrashing di HDD lambat, bikin server hang | V8 Heap dibatasi `--max-old-space-size=384` + ZRAM (RAM virtual kompresi) |
| CPU Tua & Panas | Overheating, kipas meraung bising, thermal throttling | CPU governor diatur ke `ondemand`, Nginx meng-handle static files tanpa menyentuh Node.js |
| Kehilangan Daya / Baterai Drop | Laptop mati mendadak | Service diset dengan `Restart=always` via Systemd native |

---

## 2. Langkah Setup Sekali Jalan (Di Mesin Vaio)

### Langkah 1: Kloning Repository ke Server
```bash
sudo mkdir -p /var/www/drg-app
sudo chown -R $USER:$USER /var/www/drg-app
git clone https://github.com/ardyniech/bespoke-build-it.git /var/www/drg-app
cd /var/www/drg-app
```

### Langkah 2: Jalankan Skrip Tuning Otomatis Vaio
Skrip ini akan mengonfigurasi ZRAM, mematikan fitur tidur saat layar ditutup, dan mengatur CPU governor:
```bash
chmod +x deploy/*.sh
sudo ./deploy/vaio-optimizer.sh
```

### Langkah 3: Siapkan File Konfigurasi Environment (`.env`)
Salin file environment dari template:
```bash
cp .env.example .env
nano .env
```
*(Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` sudah terisi).*

---

## 3. Menjalankan Aplikasi (Pilihan Rekomendasi: Systemd Native)

Systemd adalah opsi paling ringan karena **0 MB RAM tambahan** (tidak butuh PM2 atau Docker runtime).

### A. Aktifkan Service Systemd:
```bash
sudo cp deploy/drg-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now drg-app
```

### B. Konfigurasi Nginx (Static Asset Offloading & Reverse Proxy):
Nginx akan melayani file gambar, icon, CSS, dan JS langsung dari penyimpanan tanpa membebani Node.js:
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/drg-app
sudo ln -sf /etc/nginx/sites-available/drg-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Cara Update Kode Otomatis di Masa Depan

Cukup jalankan satu perintah:
```bash
cd /var/www/drg-app
./deploy/deploy.sh
```

---

## 5. Monitoring & Cek Status di Terminal Vaio

- **Cek Penggunaan RAM & CPU:**
  ```bash
  htop
  ```
- **Cek Status Service Aplikasi:**
  ```bash
  sudo systemctl status drg-app
  ```
- **Cek Log Real-Time:**
  ```bash
  sudo journalctl -u drg-app -f
  ```

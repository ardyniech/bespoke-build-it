#!/usr/bin/env bash
# ==============================================================================
# One-Command Deploy & Zero-Downtime Update Script (Sony Vaio)
# ==============================================================================
set -e

APP_DIR="/var/www/drg-app"
SERVICE_NAME="drg-app"

cd "$APP_DIR"

echo "==> [1/4] Mengambil kode terbaru dari repository git..."
git fetch origin main
git reset --hard origin/main

echo "==> [2/4] Memeriksa dependencies..."
# Gunakan flag low memory agar npm tidak kehabisan RAM saat install
export NODE_OPTIONS="--max-old-space-size=1024"
if [ ! -d "node_modules" ] || [ package.json -nt node_modules ]; then
  npm ci --omit=dev --ignore-scripts || npm install --production=false
fi

echo "==> [3/4] Melakukan build aplikasi hemat resource..."
npm run build:vaio

echo "==> [4/4] Merestart service aplikasi..."
if systemctl is-active --quiet "$SERVICE_NAME"; then
  sudo systemctl restart "$SERVICE_NAME"
  echo "Service systemd $SERVICE_NAME berhasil direstart."
elif command -v pm2 &> /dev/null && pm2 describe "$SERVICE_NAME" &> /dev/null; then
  pm2 reload deploy/ecosystem.config.cjs
  echo "PM2 process $SERVICE_NAME berhasil di-reload."
else
  echo "Mengaktifkan service systemd baru..."
  sudo cp deploy/drg-app.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now "$SERVICE_NAME"
fi

# Verifikasi status berjalan
sleep 2
if curl -s -f http://127.0.0.1:3000 > /dev/null 2>&1 || curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
  echo "=========================================================================="
  echo "BERHASIL: Aplikasi DRG aktif dan berjalan mulus di port 3000!"
  echo "=========================================================================="
else
  echo "PERINGATAN: Service belum merespon dalam 2 detik. Cek log dengan: sudo journalctl -u drg-app -n 30"
fi

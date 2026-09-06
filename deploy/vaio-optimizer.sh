#!/usr/bin/env bash
# ==============================================================================
# Sony Vaio Ubuntu Server Hardware & OS Fine-Tuning Script
# Optimized for: Low RAM (2-4GB), Low CPU/Fan Noise, Closed-Lid Headless Server
# ==============================================================================
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Error: Skrip ini wajib dijalankan dengan hak akses root (sudo ./vaio-optimizer.sh)"
  exit 1
fi

echo "==> [1/5] Mencegah laptop sleep saat layar/lid ditutup..."
mkdir -p /etc/systemd/logind.conf.d/
cat << 'EOF' > /etc/systemd/logind.conf.d/ignore-lid.conf
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=yes
EOF
systemctl restart systemd-logind

echo "==> [2/5] Mengoptimasi RAM & Swap (ZRAM + Swappiness 10)..."
apt-get update -qq
apt-get install -y -qq zram-tools cpufrequtils ufw nginx curl

# Set swappiness rendah agar HDD tua tidak lemot kena disk-thrashing
cat << 'EOF' > /etc/sysctl.d/99-vaio-low-ram.conf
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.dirty_background_ratio=5
vm.dirty_ratio=10
EOF
sysctl --system > /dev/null

# Aktifkan zram (kompresi RAM virtual hemat memori)
cat << 'EOF' > /etc/default/zramswap
ALGO=zstd
PERCENT=50
PRIORITY=100
EOF
systemctl restart zramswap || true

echo "==> [3/5] Mengatur CPU Governor agar suhu dingin & kipas tidak bising..."
echo 'GOVERNOR="ondemand"' > /etc/default/cpufrequtils
systemctl restart cpufrequtils || true

echo "==> [4/5] Mengonfigurasi Firewall dasar (UFW)..."
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow ssh > /dev/null
ufw allow http > /dev/null
ufw allow https > /dev/null
ufw --force enable > /dev/null

echo "==> [5/5] Memastikan Node.js LTS tersedia..."
if ! command -v node &> /dev/null; then
  echo "Menginstal Node.js v22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null
  apt-get install -y -qq nodejs
fi

echo "=========================================================================="
echo "SUKSES! Sony Vaio Ubuntu Server siap digunakan sebagai server hemat daya."
echo "Layar laptop dapat ditutup sekarang tanpa membuat server mati/sleep."
echo "=========================================================================="

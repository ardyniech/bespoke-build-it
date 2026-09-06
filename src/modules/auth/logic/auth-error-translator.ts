export function translateAuthError(error: { message?: string; code?: string; status?: number } | null | undefined): { title: string; description: string; canResend?: boolean } {
  if (!error) return { title: "Terjadi kesalahan", description: "Silakan periksa kembali formulir Anda." };

  const msg = (error.message || "").toLowerCase();

  if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
    return {
      title: "Email Belum Dikonfirmasi",
      description: "Silakan buka tautan konfirmasi yang dikirimkan ke kotak masuk / spam email Anda sebelum masuk.",
      canResend: true,
    };
  }

  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return {
      title: "Email atau Sandi Salah",
      description: "Pastikan alamat email dan kata sandi yang Anda masukkan sudah benar.",
    };
  }

  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return {
      title: "Email Sudah Terdaftar",
      description: "Akun dengan email ini sudah ada. Silakan pindah ke tab 'Masuk' atau atur ulang sandi.",
    };
  }

  if (msg.includes("password should be at least")) {
    return {
      title: "Kata Sandi Terlalu Pendek",
      description: "Kata sandi minimal terdiri dari 6 karakter untuk keamanan akun Anda.",
    };
  }

  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
    return {
      title: "Terlalu Banyak Percobaan",
      description: "Sistem membatasi percobaan demi keamanan. Mohon tunggu sekitar 1 menit sebelum mencoba lagi.",
    };
  }

  return {
    title: "Gagal Memproses",
    description: error.message || "Terjadi kendala jaringan atau server. Silakan coba sesaat lagi.",
  };
}

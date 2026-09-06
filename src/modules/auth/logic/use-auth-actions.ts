import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { translateAuthError } from "../logic/auth-error-translator";

export function useAuthActions() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);

    if (error) {
      const translated = translateAuthError(error);
      if (translated.canResend) setUnconfirmedEmail(cleanEmail);
      return toast.error(translated.title, { description: translated.description });
    }

    if (data.session) {
      toast.success("Selamat datang kembali!");
      navigate({ to: "/dashboard", replace: true });
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    if (!cleanName) return toast.error("Nama lengkap wajib diisi");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nama: cleanName, full_name: cleanName },
      },
    });
    setLoading(false);

    if (error) {
      const translated = translateAuthError(error);
      return toast.error(translated.title, { description: translated.description });
    }

    if (data.session) {
      toast.success("Akun berhasil dibuat dan langsung aktif!");
      navigate({ to: "/dashboard", replace: true });
    } else {
      setUnconfirmedEmail(cleanEmail);
      toast.info("Aktivasi Diperlukan", {
        description: "Tautan konfirmasi telah dikirimkan ke email kamu.",
      });
    }
  }

  async function handleResendEmail() {
    if (!unconfirmedEmail) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setResending(false);

    if (error) {
      const translated = translateAuthError(error);
      return toast.error(translated.title, { description: translated.description });
    }
    toast.success("Email aktivasi berhasil dikirim ulang! Silakan periksa inbox/spam.");
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      setLoading(false);
      return toast.error("Google sign-in gagal", { description: result.error.message });
    }
    if (result.redirected) return;
    setLoading(false);
    navigate({ to: "/dashboard", replace: true });
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    loading,
    resending,
    unconfirmedEmail,
    setUnconfirmedEmail,
    handleSignIn,
    handleSignUp,
    handleResendEmail,
    handleGoogle,
  };
}

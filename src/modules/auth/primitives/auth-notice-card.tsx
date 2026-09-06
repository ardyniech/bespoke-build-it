import { Link } from "@tanstack/react-router";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  email: string;
  onBackToSignIn: () => void;
  onResendEmail: () => void;
  resending: boolean;
}

export function AuthNoticeCard({ email, onBackToSignIn, onResendEmail, resending }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Mail className="h-6 w-6" />
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-foreground">
        Cek Email Kamu
      </h3>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        Tautan aktivasi telah dikirim ke <span className="font-semibold text-foreground">{email}</span>.
        Klik tautan tersebut untuk mengaktifkan akun driver kamu sebelum masuk.
      </p>

      <div className="mt-5 space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onResendEmail}
          disabled={resending}
        >
          {resending ? "Mengirim ulang..." : "Kirim ulang email aktivasi"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
          onClick={onBackToSignIn}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Sudah konfirmasi? Masuk sekarang
        </Button>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Tidak menemukan email? Cek folder <b className="text-foreground">Spam</b> atau <b className="text-foreground">Promosi</b>.
      </p>
    </div>
  );
}

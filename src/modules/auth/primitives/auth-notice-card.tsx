import { Mail, ArrowLeft, ExternalLink, HelpCircle } from "lucide-react";
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
      </p>

      {/* Trouble Receiving Email Alert Box */}
      <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-3 text-left">
        <div className="flex items-start gap-2 text-[12px] font-medium text-foreground">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Email belum masuk? Ini penyebab umumnya:</span>
        </div>
        <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground list-disc pl-5 leading-normal">
          <li>
            Masuk ke folder <b className="text-foreground">Spam</b>, <b className="text-foreground">Promotions</b>, atau <b className="text-foreground">Update</b>.
          </li>
          <li>
            Supabase default mailer memiliki kuota 3-4 email per jam per project.
          </li>
          <li>
            Atau gunakan tombol <b className="text-foreground">Lanjutkan dengan Google</b> di bawah (langsung aktif tanpa tunggu email).
          </li>
        </ul>
      </div>

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
    </div>
  );
}

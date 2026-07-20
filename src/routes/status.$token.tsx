import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MailCheck, Clock, MessageCircle, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/status/$token")({
  head: () => ({ meta: [{ title: "Status Aplikasi — DRG" }] }),
  component: StatusPage,
});

type Status = "menunggu" | "wawancara" | "direkomendasikan" | "ditolak";
type Row = {
  id: string; nama: string; status: Status; email_verified: boolean;
  created_at: string; reviewed_at: string | null; catatan_pic: string | null;
};

const STEPS: { key: Status | "verifikasi" | "kirim"; label: string; icon: any }[] = [
  { key: "kirim", label: "Formulir diterima", icon: CheckCircle2 },
  { key: "verifikasi", label: "Email terverifikasi", icon: MailCheck },
  { key: "menunggu", label: "Menunggu review PIC", icon: Clock },
  { key: "wawancara", label: "Sesi wawancara", icon: MessageCircle },
  { key: "direkomendasikan", label: "Direkomendasikan", icon: ShieldCheck },
];

function StatusPage() {
  const { token } = Route.useParams();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["status", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_application_status", { _token: token });
      if (error) throw error;
      return (data?.[0] ?? null) as Row | null;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return (
    <div className="mx-auto max-w-md p-8 text-center">
      <XCircle className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="mt-3 font-display text-xl font-bold">Aplikasi tidak ditemukan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Link status kamu tidak valid. Periksa kembali URL.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/daftar">Daftar ulang</Link></Button>
    </div>
  );

  const isRejected = data.status === "ditolak";
  const currentIdx = isRejected
    ? -1
    : !data.email_verified
      ? 0
      : data.status === "menunggu"
        ? 2
        : data.status === "wawancara"
          ? 3
          : data.status === "direkomendasikan"
            ? 4
            : 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Status Kandidat
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Halo, {data.nama}</h1>
        <p className="text-sm text-muted-foreground">
          Aplikasi kamu masuk pada {new Date(data.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>

      {isRejected ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <XCircle className="h-4 w-4" /> Aplikasi tidak dilanjutkan
          </div>
          {data.catatan_pic ? <p className="mt-2 text-sm">{data.catatan_pic}</p> : null}
        </div>
      ) : (
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const done = i < currentIdx || (i === 0);
            const active = i === currentIdx;
            const Icon = s.icon;
            return (
              <li key={s.key} className={
                "flex items-start gap-3 rounded-xl border p-4 " +
                (done ? "border-success/30 bg-success/5" :
                 active ? "border-primary/40 bg-primary/5" : "border-border bg-card")
              }>
                <div className={
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full " +
                  (done ? "bg-success text-success-foreground" :
                   active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                }>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.label}</span>
                    {done ? <Badge className="bg-success/15 text-success">Selesai</Badge> : null}
                    {active ? <Badge className="bg-primary/15 text-primary">Sedang berjalan</Badge> : null}
                  </div>
                  {s.key === "verifikasi" && !data.email_verified ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cek email kamu dan klik tautan verifikasi. Belum masuk? Buka kembali link verifikasi yang diberikan.
                    </p>
                  ) : null}
                  {s.key === "wawancara" && active ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      PIC akan menghubungi via WhatsApp untuk jadwal wawancara.
                    </p>
                  ) : null}
                  {data.catatan_pic && active ? (
                    <p className="mt-2 rounded bg-background p-2 text-xs italic">"{data.catatan_pic}"</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 flex justify-between text-xs text-muted-foreground">
        <button onClick={() => refetch()} className="underline">
          {isFetching ? "Memuat…" : "Refresh status"}
        </button>
        <span>Halaman ini otomatis refresh tiap 30 detik.</span>
      </div>
    </div>
  );
}
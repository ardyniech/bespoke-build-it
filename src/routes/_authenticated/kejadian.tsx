import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Siren, MapPin, Clock, Loader2, Users, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notifySosPush } from "@/lib/push.functions";

export const Route = createFileRoute("/_authenticated/kejadian")({
  head: () => ({ meta: [{ title: "SOS & Kejadian — DRG App" }] }),
  component: KejadianPage,
});

type Kejadian = {
  id: string;
  tipe: "sos" | "laka" | "mogok" | "lain";
  status: "open" | "on_progress" | "closed";
  deskripsi: string | null;
  alamat_text: string | null;
  lokasi_lat: number | null;
  lokasi_lng: number | null;
  pelapor_id: string;
  dibuat_at: string;
};

const statusTone: Record<string, string> = {
  open: "bg-signal text-signal-foreground",
  on_progress: "bg-warn text-warn-foreground",
  closed: "bg-success/20 text-success",
};
const statusLabel: Record<string, string> = {
  open: "Baru",
  on_progress: "Ditangani",
  closed: "Selesai",
};

function KejadianPage() {
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["kejadian"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kejadian")
        .select("*")
        .order("dibuat_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Kejadian[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["kejadian-responder-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("kejadian_responders").select("kejadian_id");
      const m: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        m[r.kejadian_id] = (m[r.kejadian_id] ?? 0) + 1;
      });
      return m;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("kejadian-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kejadian" }, () => {
        qc.invalidateQueries({ queryKey: ["kejadian"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "kejadian_responders" }, () => {
        qc.invalidateQueries({ queryKey: ["kejadian-responder-counts"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <PageShell
      eyebrow="Satgas"
      title="Log Kejadian Darurat"
      description="Riwayat SOS realtime — Baru → Ditangani → Selesai. Klik kartu untuk detail & respons."
      actions={<SosDialog />}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Belum ada kejadian. Semoga tetap aman di jalan.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((k) => (
            <Link
              key={k.id}
              to="/kejadian/$id"
              params={{ id: k.id }}
              className="block overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-primary/40 hover:shadow-warm"
            >
              <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-xs uppercase text-muted-foreground">{k.tipe}</span>
                    <Badge className={statusTone[k.status]}>{statusLabel[k.status]}</Badge>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {counts[k.id] ?? 0} responder
                    </span>
                  </div>
                  <h3 className="truncate font-display text-lg font-bold">
                    {k.deskripsi || "Tanpa deskripsi"}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {new Date(k.dibuat_at).toLocaleString("id-ID")}
                    </span>
                    {k.alamat_text && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {k.alamat_text}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function SosDialog() {
  const qc = useQueryClient();
  const notify = useServerFn(notifySosPush);
  const [open, setOpen] = useState(false);
  const [tipe, setTipe] = useState<"sos" | "laka" | "mogok" | "lain">("sos");
  const [deskripsi, setDeskripsi] = useState("");
  const [alamat, setAlamat] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!open || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!coords && alamat.trim().length < 4) {
        throw new Error(
          "Lokasi GPS belum terdeteksi. Isi alamat/patokan minimal 4 karakter agar Satgas bisa menemukanmu.",
        );
      }
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Tidak ada sesi");
      const { data: inserted, error } = await supabase
        .from("kejadian")
        .insert({
          tipe,
          deskripsi: deskripsi.trim() || null,
          alamat_text: alamat.trim() || null,
          lokasi_lat: coords?.lat ?? null,
          lokasi_lng: coords?.lng ?? null,
          pelapor_id: u.user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      try {
        await notify({
          data: {
            kejadianId: inserted.id,
            title: `🚨 ${tipe.toUpperCase()} — DRG`,
            body: `${alamat || "Lokasi tidak dijelaskan"} — ${deskripsi || "butuh bantuan"}`,
            url: `/kejadian/${inserted.id}`,
          },
        });
      } catch (err) {
        console.warn("Notif push gagal:", err);
      }
    },
    onSuccess: () => {
      toast.success("SOS terkirim — Satgas dinotifikasi");
      qc.invalidateQueries({ queryKey: ["kejadian"] });
      setOpen(false);
      setDeskripsi("");
      setAlamat("");
    },
    onError: (e: Error) => toast.error("Gagal mengirim", { description: e.message }),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-signal text-signal-foreground shadow-warm hover:bg-signal/90">
          <Siren className="mr-1.5 h-4 w-4" /> Tekan SOS
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kirim sinyal darurat?</AlertDialogTitle>
          <AlertDialogDescription>
            Lokasi kamu akan dikirim ke Satgas. Isi konteks singkat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Tipe</Label>
            <Select value={tipe} onValueChange={(v) => setTipe(v as typeof tipe)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sos">SOS Umum</SelectItem>
                <SelectItem value="laka">Kecelakaan</SelectItem>
                <SelectItem value="mogok">Mogok</SelectItem>
                <SelectItem value="lain">Lain-lain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="a">Alamat / patokan</Label>
            <Input id="a" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Contoh: Jl. Soekarno-Hatta, depan Indomaret" />
          </div>
          <div>
            <Label htmlFor="dk">Kronologi singkat</Label>
            <Textarea id="dk" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} />
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
            {coords ? (
              <span className="font-mono">📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            ) : (
              <span className="text-warn-foreground">
                Mendeteksi lokasi… (izinkan GPS). Kalau gagal, wajib isi alamat/patokan.
              </span>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="bg-signal text-signal-foreground hover:bg-signal/90"
            disabled={mut.isPending || (!coords && alamat.trim().length < 4)}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim SOS
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
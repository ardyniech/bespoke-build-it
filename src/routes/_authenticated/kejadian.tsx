import { createFileRoute } from "@tanstack/react-router";
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
import { Siren, MapPin, Clock, Loader2, CheckCircle2, HandHelping } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

  useEffect(() => {
    const ch = supabase
      .channel("kejadian-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kejadian" }, () => {
        qc.invalidateQueries({ queryKey: ["kejadian"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <PageShell
      eyebrow="Satgas"
      title="Log Kejadian Darurat"
      description="Riwayat SOS realtime — Baru → Ditangani → Selesai."
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
        <div className="space-y-4">
          {data.map((k) => <KejadianCard key={k.id} k={k} />)}
        </div>
      )}
    </PageShell>
  );
}

function KejadianCard({ k }: { k: Kejadian }) {
  const qc = useQueryClient();
  const respondMut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Tidak ada sesi");
      const { error: e1 } = await supabase.from("kejadian_responders").insert({
        kejadian_id: k.id, user_id: u.user.id,
      });
      if (e1 && !e1.message.includes("duplicate")) throw e1;
      if (k.status === "open") {
        const { error } = await supabase
          .from("kejadian")
          .update({ status: "on_progress" })
          .eq("id", k.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Kamu tercatat sebagai responder");
      qc.invalidateQueries({ queryKey: ["kejadian"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const closeMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("kejadian")
        .update({ status: "closed", ditutup_at: new Date().toISOString() })
        .eq("id", k.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kejadian ditutup");
      qc.invalidateQueries({ queryKey: ["kejadian"] });
    },
    onError: (e: Error) => toast.error("Gagal menutup", { description: e.message }),
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-xs uppercase text-muted-foreground">{k.tipe}</span>
            <Badge className={statusTone[k.status]}>{statusLabel[k.status]}</Badge>
          </div>
          <h3 className="font-display text-lg font-bold">{k.deskripsi || "Tanpa deskripsi"}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {new Date(k.dibuat_at).toLocaleString("id-ID")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {k.status !== "closed" && (
            <Button size="sm" variant="outline" onClick={() => respondMut.mutate()} disabled={respondMut.isPending}>
              <HandHelping className="mr-1.5 h-4 w-4" /> Merespons
            </Button>
          )}
          {k.status !== "closed" && (
            <Button size="sm" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}
              className="bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Tutup
            </Button>
          )}
        </div>
      </div>
      {(k.alamat_text || k.lokasi_lat) && (
        <div className="p-5 text-sm">
          <div className="inline-flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {k.alamat_text || "Lokasi tidak dijelaskan"}
              {k.lokasi_lat != null && k.lokasi_lng != null && (
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  ({k.lokasi_lat.toFixed(4)}, {k.lokasi_lng.toFixed(4)})
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

function SosDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipe, setTipe] = useState<"sos" | "laka" | "mogok" | "lain">("sos");
  const [deskripsi, setDeskripsi] = useState("");
  const [alamat, setAlamat] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!open || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { /* ignore */ },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Tidak ada sesi");
      const { error } = await supabase.from("kejadian").insert({
        tipe,
        deskripsi: deskripsi || null,
        alamat_text: alamat || null,
        lokasi_lat: coords?.lat ?? null,
        lokasi_lng: coords?.lng ?? null,
        pelapor_id: u.user.id,
      });
      if (error) throw error;
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <span className="font-mono">
                📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : (
              <span className="text-muted-foreground">Mendeteksi lokasi… (izinkan GPS)</span>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); mut.mutate(); }}
            className="bg-signal text-signal-foreground hover:bg-signal/90"
            disabled={mut.isPending}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim SOS
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Plus, Search, Copy, EyeOff, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/etik")({
  head: () => ({
    meta: [
      { title: "Dewan Etik — DRG App" },
      {
        name: "description",
        content: "Kanal pelaporan pelanggaran etik komunitas DRG, bisa anonim dan dijaga kerahasiaannya.",
      },
      { property: "og:title", content: "Dewan Etik — DRG App" },
      {
        property: "og:description",
        content: "Kanal pelaporan pelanggaran etik komunitas DRG, bisa anonim dan dijaga kerahasiaannya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EtikPage,
});

type Status = "diterima" | "diproses" | "selesai";

type Laporan = {
  id: string;
  pelapor_id: string | null;
  anonim: boolean;
  terlapor_nama: string;
  isi_laporan: string;
  status: Status;
  catatan_penanganan: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_STYLE: Record<Status, string> = {
  diterima: "bg-warn/15 text-warn-foreground",
  diproses: "bg-primary/15 text-primary",
  selesai: "bg-success/15 text-success",
};

function waktu(v: string) {
  return new Date(v).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EtikPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isDewan = !!me?.roles.some(
    (r) => r === "dewan_etik" || r === "admin" || r === "super_admin",
  );

  const [formOpen, setFormOpen] = useState(false);
  const [anonim, setAnonim] = useState(false);
  const [terlapor, setTerlapor] = useState("");
  const [isi, setIsi] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const [cekToken, setCekToken] = useState("");
  const [hasilCek, setHasilCek] = useState<
    { status: string; catatan_penanganan: string | null; created_at: string; updated_at: string } | null
  >(null);

  const [detail, setDetail] = useState<Laporan | null>(null);
  const [draftStatus, setDraftStatus] = useState<Status>("diterima");
  const [draftCatatan, setDraftCatatan] = useState("");

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["laporan-etik", isDewan],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("laporan_etik")
        .select(
          "id, pelapor_id, anonim, terlapor_nama, isi_laporan, status, catatan_penanganan, created_at, updated_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Laporan[];
    },
  });

  const pelaporIds = Array.from(
    new Set(list.filter((l) => !l.anonim && l.pelapor_id).map((l) => l.pelapor_id!)),
  );
  const { data: namaPelapor = {} } = useQuery({
    queryKey: ["laporan-etik-nama", pelaporIds.join(",")],
    enabled: isDewan && pelaporIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama")
        .in("id", pelaporIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => (map[p.id] = p.nama));
      return map;
    },
  });

  const kirim = useMutation({
    mutationFn: async () => {
      if (!me?.id) throw new Error("Sesi tidak ditemukan");
      if (terlapor.trim().length < 3) throw new Error("Nama pihak terlapor wajib diisi");
      if (isi.trim().length < 20) throw new Error("Isi laporan minimal 20 karakter");
      const { data, error } = await supabase
        .from("laporan_etik")
        .insert({
          anonim,
          pelapor_id: anonim ? null : me.id,
          terlapor_nama: terlapor.trim(),
          isi_laporan: isi.trim(),
        })
        .select("access_token, anonim")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Laporan terkirim ke Dewan Etik");
      setFormOpen(false);
      setTerlapor("");
      setIsi("");
      setToken(data?.anonim ? (data.access_token as string) : null);
      setAnonim(false);
      qc.invalidateQueries({ queryKey: ["laporan-etik"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cek = useMutation({
    mutationFn: async () => {
      const t = cekToken.trim();
      if (!t) throw new Error("Masukkan token laporan");
      const { data, error } = await supabase.rpc("cek_status_laporan_etik", { _token: t });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Token tidak ditemukan");
      return data[0]!;
    },
    onSuccess: (d) => setHasilCek(d),
    onError: (e: Error) => {
      setHasilCek(null);
      toast.error(e.message);
    },
  });

  const simpanPenanganan = useMutation({
    mutationFn: async () => {
      if (!detail || !me?.id) return;
      const { error } = await supabase
        .from("laporan_etik")
        .update({
          status: draftStatus,
          catatan_penanganan: draftCatatan.trim() || null,
          handled_by: me.id,
        })
        .eq("id", detail.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Penanganan laporan diperbarui");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["laporan-etik"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetail = (l: Laporan) => {
    setDetail(l);
    setDraftStatus(l.status);
    setDraftCatatan(l.catatan_penanganan ?? "");
  };

  return (
    <PageShell
      eyebrow="Dewan Etik"
      title="Laporan Pelanggaran"
      description={
        isDewan
          ? "Semua laporan masuk. Identitas pelapor anonim tidak pernah ditampilkan — jaga kerahasiaan isi laporan."
          : "Laporkan dugaan pelanggaran etik. Kamu bisa memilih mode anonim; hanya Dewan Etik yang membaca isinya."
      }
      actions={
        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Buat Laporan
        </Button>
      }
    >
      {token ? (
        <div className="mb-5 rounded-2xl border border-warn/40 bg-warn/10 p-5">
          <h3 className="font-display text-base font-bold">Simpan token laporan anonim kamu</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Token ini <b>tidak akan ditampilkan lagi</b>. Tanpa token, kamu tidak bisa memantau status
            laporan anonim ini — by design, kami tidak menyimpan kaitan ke identitasmu.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-background px-3 py-2 font-mono text-xs">{token}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(token);
                toast.success("Token disalin");
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Salin
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setToken(null)}>
              Saya sudah simpan
            </Button>
          </div>
        </div>
      ) : null}

      {!isDewan ? (
        <div className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display text-base font-bold">Cek status laporan (pakai token)</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              placeholder="Tempel token laporan anonim"
              value={cekToken}
              onChange={(e) => setCekToken(e.target.value)}
              className="max-w-sm font-mono text-xs"
            />
            <Button variant="outline" onClick={() => cek.mutate()} disabled={cek.isPending}>
              <Search className="mr-1.5 h-4 w-4" /> {cek.isPending ? "Mengecek…" : "Cek"}
            </Button>
          </div>
          {hasilCek ? (
            <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLE[hasilCek.status as Status]}>{hasilCek.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  Dikirim {waktu(hasilCek.created_at)} · Update {waktu(hasilCek.updated_at)}
                </span>
              </div>
              <p className="mt-2">
                {hasilCek.catatan_penanganan ?? "Belum ada catatan penanganan dari Dewan Etik."}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <h3 className="mb-3 font-display text-lg font-bold">
        {isDewan ? "Semua laporan masuk" : "Laporan yang kamu buat (non-anonim)"}
      </h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat laporan…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDewan
              ? "Belum ada laporan masuk."
              : "Kamu belum punya laporan non-anonim. Laporan anonim hanya bisa dilacak lewat token."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((l) => (
            <article
              key={l.id}
              onClick={() => isDewan && openDetail(l)}
              className={
                "flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition " +
                (isDewan ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40" : "")
              }
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                {l.anonim ? <EyeOff className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_STYLE[l.status]}>{l.status}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{waktu(l.created_at)}</span>
                </div>
                <h4 className="font-display text-base font-bold">Terlapor: {l.terlapor_nama}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.isi_laporan}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pelapor:{" "}
                  {l.anonim
                    ? "Anonim (identitas dirahasiakan)"
                    : (namaPelapor[l.pelapor_id ?? ""] ?? (l.pelapor_id === me?.id ? "Kamu" : "Anggota"))}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail & penanganan (Dewan Etik) */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Terlapor: {detail.terlapor_nama}</DialogTitle>
                <DialogDescription>
                  {waktu(detail.created_at)} ·{" "}
                  {detail.anonim
                    ? "Pelapor anonim"
                    : `Pelapor ${namaPelapor[detail.pelapor_id ?? ""] ?? "Anggota"}`}
                </DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-3 text-sm">
                {detail.isi_laporan}
              </div>
              <div className="grid gap-1.5">
                <Label>Status penanganan</Label>
                <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v as Status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diterima">Diterima</SelectItem>
                    <SelectItem value="diproses">Diproses</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="catatan-etik">Catatan penanganan</Label>
                <Textarea
                  id="catatan-etik"
                  rows={4}
                  value={draftCatatan}
                  onChange={(e) => setDraftCatatan(e.target.value)}
                  placeholder="Ringkasan tindak lanjut yang bisa dibaca pelapor."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>
                  Tutup
                </Button>
                <Button
                  onClick={() => simpanPenanganan.mutate()}
                  disabled={simpanPenanganan.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {simpanPenanganan.isPending ? "Menyimpan…" : "Simpan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form laporan */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Buat Laporan Etik</DialogTitle>
            <DialogDescription>
              Isi laporan hanya dibaca Dewan Etik. Sampaikan fakta sejelas mungkin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
              <div>
                <Label htmlFor="anonim">Kirim sebagai anonim</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Identitasmu tidak disimpan. Kamu akan menerima token untuk memantau status.
                </p>
              </div>
              <Switch id="anonim" checked={anonim} onCheckedChange={setAnonim} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="terlapor">Nama pihak terlapor</Label>
              <Input
                id="terlapor"
                value={terlapor}
                onChange={(e) => setTerlapor(e.target.value)}
                placeholder="Nama / identitas pihak yang dilaporkan"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="isi">Isi laporan</Label>
              <Textarea
                id="isi"
                rows={6}
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Kronologi, waktu, lokasi, dan bukti pendukung bila ada."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => kirim.mutate()}
              disabled={kirim.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {kirim.isPending ? "Mengirim…" : "Kirim laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
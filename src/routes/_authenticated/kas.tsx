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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIs } from "@/hooks/use-my-role";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => ({ meta: [{ title: "Kas & Keuangan — DRG App" }] }),
  component: KasPage,
});

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

type Row = {
  id: string;
  tanggal: string;
  deskripsi: string | null;
  kategori: string;
  jenis: "masuk" | "keluar";
  jumlah: number;
  ledger: "sosial" | "umum";
};

function tier(jumlah: number) {
  if (jumlah < 500_000) return { label: "Hijau", tone: "bg-success/15 text-success border-success/30" };
  if (jumlah < 2_000_000) return { label: "Kuning", tone: "bg-warn/25 text-warn-foreground border-warn/40" };
  if (jumlah < 5_000_000) return { label: "Oranye", tone: "bg-signal/15 text-signal border-signal/30" };
  return { label: "Merah", tone: "bg-destructive/15 text-destructive border-destructive/30" };
}

function KasPage() {
  const canWrite = useIs("bendahara");
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["kas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kas_transactions")
        .select("id, tanggal, deskripsi, kategori, jenis, jumlah, ledger")
        .order("tanggal", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Row[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("kas-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kas_transactions" }, () => {
        qc.invalidateQueries({ queryKey: ["kas"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const totals = (data ?? []).reduce(
    (acc, r) => {
      const sign = r.jenis === "masuk" ? 1 : -1;
      if (r.ledger === "sosial") acc.sosial += sign * r.jumlah;
      else acc.koperasi += sign * r.jumlah;
      return acc;
    },
    { sosial: 0, koperasi: 0 }
  );

  return (
    <PageShell
      eyebrow="Bendahara"
      title="Kas & Keuangan"
      description="Ledger real-time dua rekening: Kas Sosial dan Koperasi. Approval berjenjang mengikuti Matriks Wewenang."
      actions={canWrite ? <NewTxDialog /> : null}
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <BalanceCard label="Kas Sosial" value={totals.sosial} highlight />
        <BalanceCard label="Kas Umum" value={totals.koperasi} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Transaksi Terbaru</h2>
        <div className="text-xs text-muted-foreground">Tier: Hijau · Kuning · Oranye · Merah</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Belum ada transaksi. {canWrite ? "Catat transaksi pertama untuk mulai." : "Bendahara belum mencatat transaksi."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3">Ledger</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Masuk</th>
                <th className="px-4 py-3 text-right">Keluar</th>
                <th className="px-4 py-3">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((r) => {
                const t = tier(r.jumlah);
                return (
                  <tr key={r.id} className="transition hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.deskripsi || "—"}</td>
                    <td className="px-4 py-3 capitalize">{r.ledger}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.kategori}</td>
                    <td className="px-4 py-3 text-right font-mono text-success">
                      {r.jenis === "masuk" ? fmt(r.jumlah) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-signal">
                      {r.jenis === "keluar" ? fmt(r.jumlah) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={t.tone}>{t.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}

function BalanceCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? "relative overflow-hidden rounded-2xl bg-gradient-warm p-6 text-primary-foreground shadow-warm"
          : "rounded-2xl border border-border bg-card p-6 shadow-card"
      }
    >
      <div className={`flex items-center justify-between ${highlight ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
        <span className="text-xs uppercase tracking-widest">{label}</span>
        <Wallet className="h-5 w-5" />
      </div>
      <div className="mt-3 font-display text-4xl font-bold">{fmt(value)}</div>
      <div className={`mt-2 flex items-center gap-3 text-xs ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        <span className="inline-flex items-center gap-1">
          <ArrowUpRight className="h-3.5 w-3.5" /> Masuk
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowDownRight className="h-3.5 w-3.5" /> Keluar
        </span>
      </div>
    </div>
  );
}

function NewTxDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [jenis, setJenis] = useState<"masuk" | "keluar">("masuk");
  const [ledger, setLedger] = useState<"sosial" | "umum">("sosial");
  const [kategori, setKategori] = useState("Iuran");
  const [jumlah, setJumlah] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [bukti, setBukti] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Tidak ada sesi");
      let bukti_path: string | null = null;
      if (bukti) {
        const ext = bukti.name.split(".").pop() ?? "bin";
        const path = `${u.user.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("bukti-kas").upload(path, bukti);
        if (up.error) throw up.error;
        bukti_path = up.data.path;
      }
      const { error } = await supabase.from("kas_transactions").insert({
        jenis,
        ledger,
        kategori,
        jumlah: Number(jumlah),
        deskripsi: deskripsi || null,
        tanggal,
        bukti_path,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaksi tercatat");
      qc.invalidateQueries({ queryKey: ["kas"] });
      setOpen(false);
      setJumlah("");
      setDeskripsi("");
      setBukti(null);
    },
    onError: (e: Error) => toast.error("Gagal menyimpan", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Transaksi Baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Transaksi</DialogTitle>
          <DialogDescription>Isi detail. Bukti (opsional) akan diunggah aman.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="grid gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jenis</Label>
              <Select value={jenis} onValueChange={(v) => setJenis(v as "masuk" | "keluar")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ledger</Label>
              <Select value={ledger} onValueChange={(v) => setLedger(v as "sosial" | "umum")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sosial">Sosial</SelectItem>
                  <SelectItem value="umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="k">Kategori</Label>
              <Input id="k" value={kategori} onChange={(e) => setKategori(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="t">Tanggal</Label>
              <Input id="t" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="j">Jumlah (Rp)</Label>
            <Input id="j" type="number" min="1" required value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="d">Keterangan</Label>
            <Textarea id="d" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor="b">Bukti (opsional)</Label>
            <Input id="b" type="file" accept="image/*,application/pdf" onChange={(e) => setBukti(e.target.files?.[0] ?? null)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

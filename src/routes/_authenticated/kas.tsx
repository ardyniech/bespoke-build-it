import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Download, Loader2, Plus, TrendingDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useIs } from "@/hooks/use-my-role";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => ({ meta: [{ title: "Kas Komunitas — DRG App" }] }),
  component: KasPage,
});

type Tx = {
  id: string;
  ledger: "sosial" | "umum";
  jenis: "masuk" | "keluar";
  jumlah: number;
  kategori: string | null;
  deskripsi: string | null;
  bukti_path: string | null;
  tanggal: string;
  created_by: string | null;
  status: "menunggu" | "disetujui" | "ditolak";
  approved_by: string | null;
  approved_at: string | null;
  catatan_approver: string | null;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function KasPage() {
  const qc = useQueryClient();
  const isBendahara = useIs("bendahara");
  const isAdmin = useIs("admin");
  const canApprove = isBendahara || isAdmin;

  const [ledgerFilter, setLedgerFilter] = useState<"all" | "sosial" | "umum">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Tx["status"]>("all");
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["kas-tx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kas_transactions")
        .select("*")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Tx[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("kas-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kas_transactions" }, () =>
        qc.invalidateQueries({ queryKey: ["kas-tx"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (ledgerFilter !== "all" && r.ledger !== ledgerFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (term) {
        const hay = `${r.kategori ?? ""} ${r.deskripsi ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, ledgerFilter, statusFilter, q]);

  const totals = useMemo(() => {
    const acc = { sosial: 0, umum: 0, menunggu: 0 };
    rows.forEach((r) => {
      if (r.status === "menunggu") acc.menunggu += 1;
      if (r.status !== "disetujui") return;
      const delta = r.jenis === "masuk" ? Number(r.jumlah) : -Number(r.jumlah);
      acc[r.ledger] += delta;
    });
    return acc;
  }, [rows]);

  const approve = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: "disetujui" | "ditolak"; note?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("kas_transactions")
        .update({
          status,
          approved_by: u.user?.id ?? null,
          approved_at: new Date().toISOString(),
          catatan_approver: note ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => toast.success(v.status === "disetujui" ? "Disetujui" : "Ditolak"),
    onError: (e: Error) => toast.error(e.message),
  });

  function exportCsv() {
    const header = ["tanggal", "ledger", "jenis", "jumlah", "kategori", "deskripsi", "status"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const cells = [
        r.tanggal,
        r.ledger,
        r.jenis,
        String(r.jumlah),
        (r.kategori ?? "").replaceAll('"', '""'),
        (r.deskripsi ?? "").replaceAll('"', '""'),
        r.status,
      ].map((c) => `"${c}"`);
      lines.push(cells.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kas-drg-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell
      eyebrow="Bendahara"
      title="Kas Komunitas"
      description="Ledger sosial & umum transparan. Transaksi ≥ Rp 500.000 butuh persetujuan admin/bendahara."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> CSV
          </Button>
          {isBendahara && <NewTxDialog />}
        </div>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <BalanceCard label="Saldo Sosial" value={totals.sosial} tone="success" />
        <BalanceCard label="Saldo Koperasi" value={totals.umum} tone="primary" />
        <div className="rounded-2xl border border-warn/40 bg-warn/10 p-5 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-warn-foreground/80">Menunggu approval</div>
          <div className="mt-2 text-3xl font-bold text-warn-foreground">{totals.menunggu}</div>
          <div className="mt-1 text-xs text-muted-foreground">Transaksi bernilai besar butuh review.</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Cari kategori/deskripsi…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={ledgerFilter} onValueChange={(v) => setLedgerFilter(v as typeof ledgerFilter)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua ledger</SelectItem>
            <SelectItem value="sosial">Sosial</SelectItem>
            <SelectItem value="umum">Koperasi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="menunggu">Menunggu</SelectItem>
            <SelectItem value="disetujui">Disetujui</SelectItem>
            <SelectItem value="ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Tidak ada transaksi sesuai filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Tanggal</th>
                <th className="px-4 py-2 text-left">Ledger</th>
                <th className="px-4 py-2 text-left">Kategori</th>
                <th className="px-4 py-2 text-right">Jumlah</th>
                <th className="px-4 py-2 text-left">Status</th>
                {canApprove && <th className="px-4 py-2 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/60 align-top hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">{r.ledger}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.kategori ?? "—"}</div>
                    {r.deskripsi && <div className="text-xs text-muted-foreground">{r.deskripsi}</div>}
                  </td>
                  <td className={"px-4 py-3 text-right font-mono font-semibold " + (r.jenis === "masuk" ? "text-success" : "text-signal")}>
                    <span className="inline-flex items-center gap-1">
                      {r.jenis === "masuk" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {r.jenis === "masuk" ? "+" : "-"}{rupiah(Number(r.jumlah))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        r.status === "disetujui"
                          ? "bg-success/20 text-success"
                          : r.status === "ditolak"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-warn text-warn-foreground"
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3 text-right">
                      {r.status === "menunggu" ? (
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => approve.mutate({ id: r.id, status: "disetujui" })}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => approve.mutate({ id: r.id, status: "ditolak" })}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {r.approved_at ? new Date(r.approved_at).toLocaleDateString("id-ID") : "—"}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function BalanceCard({ label, value, tone }: { label: string; value: number; tone: "success" | "primary" }) {
  return (
    <div
      className={
        "rounded-2xl border p-5 shadow-card " +
        (tone === "success" ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5")
      }
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-2 text-3xl font-bold " + (tone === "success" ? "text-success" : "text-primary")}>
        {rupiah(value)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Saldo dari transaksi disetujui.</div>
    </div>
  );
}

function NewTxDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [ledger, setLedger] = useState<Tx["ledger"]>("sosial");
  const [jenis, setJenis] = useState<Tx["jenis"]>("masuk");
  const [jumlah, setJumlah] = useState("");
  const [kategori, setKategori] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [bukti, setBukti] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Butuh sesi");
      let bukti_path: string | null = null;
      if (bukti) {
        const path = `${u.user.id}/${Date.now()}-${bukti.name}`;
        const { error } = await supabase.storage.from("bukti-kas").upload(path, bukti);
        if (error) throw error;
        bukti_path = path;
      }
      const { error } = await supabase.from("kas_transactions").insert({
        ledger,
        jenis,
        jumlah: Number(jumlah || 0),
        kategori: kategori || undefined,
        deskripsi: deskripsi || undefined,
        tanggal,
        bukti_path,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaksi disimpan");
      qc.invalidateQueries({ queryKey: ["kas-tx"] });
      setOpen(false);
      setJumlah("");
      setKategori("");
      setDeskripsi("");
      setBukti(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Transaksi baru</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Transaksi kas baru</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ledger</Label>
              <Select value={ledger} onValueChange={(v) => setLedger(v as Tx["ledger"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sosial">Sosial</SelectItem>
                  <SelectItem value="umum">Koperasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jenis</Label>
              <Select value={jenis} onValueChange={(v) => setJenis(v as Tx["jenis"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">Masuk</SelectItem>
                  <SelectItem value="keluar">Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jumlah (Rp)</Label>
              <Input inputMode="numeric" value={jumlah} onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Kategori</Label>
            <Input value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="Iuran, santunan, operasional…" />
          </div>
          <div>
            <Label>Catatan</Label>
            <Textarea rows={2} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
          </div>
          <div>
            <Label>Bukti (opsional)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setBukti(e.target.files?.[0] ?? null)} />
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Transaksi ≥ Rp 500.000 otomatis berstatus <b>menunggu</b> hingga disetujui.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !jumlah}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
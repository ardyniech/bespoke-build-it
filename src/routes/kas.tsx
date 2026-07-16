import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Plus, Wallet } from "lucide-react";

export const Route = createFileRoute("/kas")({
  head: () => ({ meta: [{ title: "Kas & Keuangan — DRG App" }] }),
  component: KasPage,
});

const ledger = [
  { tgl: "16 Jul", ket: "Iuran mingguan — Blimbing", kat: "Iuran", masuk: 240000, keluar: 0, tier: "Hijau" },
  { tgl: "15 Jul", ket: "Bantuan bengkel Pak Yanto", kat: "Sosial", masuk: 0, keluar: 350000, tier: "Kuning" },
  { tgl: "14 Jul", ket: "Donasi Koperasi Sinar Mulya", kat: "Donasi", masuk: 1000000, keluar: 0, tier: "Hijau" },
  { tgl: "12 Jul", ket: "Renovasi posko Klojen", kat: "Operasional", masuk: 0, keluar: 1750000, tier: "Oranye" },
  { tgl: "10 Jul", ket: "Iuran mingguan — Sukun", kat: "Iuran", masuk: 180000, keluar: 0, tier: "Hijau" },
];

const tierTone: Record<string, string> = {
  Hijau: "bg-success/15 text-success border-success/30",
  Kuning: "bg-warn/25 text-warn-foreground border-warn/40",
  Oranye: "bg-signal/15 text-signal border-signal/30",
  Merah: "bg-destructive/15 text-destructive border-destructive/30",
};

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

function KasPage() {
  return (
    <PageShell
      eyebrow="Bendahara"
      title="Kas & Keuangan"
      description="Ledger real-time dua rekening: Kas Sosial dan Koperasi. Approval berjenjang mengikuti Matriks Wewenang."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Transaksi Baru
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-warm p-6 text-primary-foreground shadow-warm">
          <div className="flex items-center justify-between text-primary-foreground/85">
            <span className="text-xs uppercase tracking-widest">Kas Sosial</span>
            <Wallet className="h-5 w-5" />
          </div>
          <div className="mt-3 font-display text-4xl font-bold">Rp 4.820.000</div>
          <div className="mt-2 flex items-center gap-4 text-xs text-primary-foreground/80">
            <span className="inline-flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5" /> +Rp 1.420rb
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDownRight className="h-3.5 w-3.5" /> −Rp 2.100rb
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-widest">Kas Koperasi</span>
            <Wallet className="h-5 w-5" />
          </div>
          <div className="mt-3 font-display text-4xl font-bold">Rp 12.340.000</div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-success">
              <ArrowUpRight className="h-3.5 w-3.5" /> +Rp 3.200rb
            </span>
            <span className="inline-flex items-center gap-1 text-signal">
              <ArrowDownRight className="h-3.5 w-3.5" /> −Rp 850rb
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Transaksi Terbaru</h2>
        <div className="text-xs text-muted-foreground">Approval: Hijau → Kuning → Oranye → Merah</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3 text-right">Masuk</th>
              <th className="px-4 py-3 text-right">Keluar</th>
              <th className="px-4 py-3">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ledger.map((r, i) => (
              <tr key={i} className="transition hover:bg-muted/40">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.tgl}</td>
                <td className="px-4 py-3 font-medium">{r.ket}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.kat}</td>
                <td className="px-4 py-3 text-right font-mono text-success">
                  {r.masuk ? fmt(r.masuk) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-signal">
                  {r.keluar ? fmt(r.keluar) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={tierTone[r.tier]}>
                    {r.tier}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
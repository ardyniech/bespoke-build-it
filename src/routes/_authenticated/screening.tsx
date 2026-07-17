import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/screening")({
  head: () => ({ meta: [{ title: "Screening Calon — DRG App" }] }),
  component: ScreeningPage,
});

const calon = [
  { nama: "Rudi Hartono", hp: "0812-6677-8899", tgl: "15 Jul", status: "Direkomendasikan" },
  { nama: "Anwar Sadad", hp: "0857-2233-4455", tgl: "13 Jul", status: "Menunggu review" },
  { nama: "Bagus Priyanto", hp: "0898-9988-7766", tgl: "10 Jul", status: "Perlu wawancara" },
  { nama: "Firman Aji", hp: "0821-1122-3344", tgl: "08 Jul", status: "Ditolak" },
];

function ScreeningPage() {
  return (
    <PageShell
      eyebrow="PIC Kaderisasi"
      title="Screening Calon Anggota"
      description="Hasil form publik terintegrasi. Skor detail dikunci — hanya PIC Kaderisasi & Super Admin yang dapat membuka."
      actions={
        <Button variant="outline" size="sm">Bagikan Link Formulir Publik</Button>
      }
    >
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <div className="font-semibold text-primary">Kunci skor rahasia</div>
          <p className="text-muted-foreground">
            Bobot pertanyaan tidak pernah dikirim ke frontend publik. Skor
            per-calon terlihat hanya untuk role Kaderisasi & Super Admin.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Calon</th>
              <th className="px-4 py-3">No. HP</th>
              <th className="px-4 py-3">Tgl. Submit</th>
              <th className="px-4 py-3">Skor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {calon.map((c) => (
              <tr key={c.hp} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <span className="font-medium">{c.nama}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.hp}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.tgl}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
                    <Lock className="h-3 w-3" /> •••
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      c.status === "Direkomendasikan"
                        ? "border-success/40 text-success"
                        : c.status === "Ditolak"
                          ? "border-destructive/40 text-destructive"
                          : "border-warn/50 text-warn-foreground"
                    }
                  >
                    {c.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="text-xs">Buka skor</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
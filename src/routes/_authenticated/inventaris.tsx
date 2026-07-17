import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/inventaris")({
  head: () => ({ meta: [{ title: "Inventaris — DRG App" }] }),
  component: InventarisPage,
});

const items = [
  { nama: "Helm Cadangan DRG", jumlah: 12, kondisi: "Baik", lokasi: "Posko Klojen" },
  { nama: "Rompi Satgas (Reflektif)", jumlah: 20, kondisi: "Baik", lokasi: "Posko Klojen" },
  { nama: "Kotak P3K", jumlah: 5, kondisi: "Perlu isi ulang", lokasi: "Posko Sukun" },
  { nama: "HT (Handy Talky)", jumlah: 8, kondisi: "Rusak: 1", lokasi: "Posko Blimbing" },
  { nama: "Bendera & Spanduk", jumlah: 15, kondisi: "Baik", lokasi: "Sekretariat" },
];

function InventarisPage() {
  return (
    <PageShell
      eyebrow="Logistik"
      title="Inventaris Komunitas"
      description="Katalog barang komunitas mengacu F-LOG-01."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Tambah Barang
        </Button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Barang</th>
              <th className="px-4 py-3 text-right">Jumlah</th>
              <th className="px-4 py-3">Kondisi</th>
              <th className="px-4 py-3">Lokasi Simpan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={it.nama} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-medium">{it.nama}</td>
                <td className="px-4 py-3 text-right font-mono">{it.jumlah}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      it.kondisi === "Baik"
                        ? "border-success/40 text-success"
                        : it.kondisi.startsWith("Rusak")
                          ? "border-destructive/40 text-destructive"
                          : "border-warn/50 text-warn-foreground"
                    }
                  >
                    {it.kondisi}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{it.lokasi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
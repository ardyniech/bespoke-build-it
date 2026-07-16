import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter } from "lucide-react";

export const Route = createFileRoute("/anggota")({
  head: () => ({ meta: [{ title: "Data Anggota — DRG App" }] }),
  component: AnggotaPage,
});

const anggota = [
  { nama: "Bang Parjo", hp: "0812-3311-4455", wilayah: "Klojen", jenjang: "Inti", status: "Aktif" },
  { nama: "Mas Yanto", hp: "0857-8899-1122", wilayah: "Blimbing", jenjang: "Muda", status: "Aktif" },
  { nama: "Cak Roni", hp: "0898-1122-3344", wilayah: "Sukun", jenjang: "Inti", status: "Aktif" },
  { nama: "Dimas Prakoso", hp: "0812-9911-2233", wilayah: "Kedungkandang", jenjang: "Magang", status: "Magang" },
  { nama: "Bu Sulis", hp: "0821-4433-2211", wilayah: "Lowokwaru", jenjang: "Muda", status: "Aktif" },
  { nama: "Pak Slamet", hp: "0813-5566-7788", wilayah: "Klojen", jenjang: "Inti", status: "Cuti" },
];

const jenjangTone: Record<string, string> = {
  Inti: "bg-primary/10 text-primary",
  Muda: "bg-accent/25 text-accent-foreground",
  Magang: "bg-muted text-muted-foreground",
};

function AnggotaPage() {
  return (
    <PageShell
      eyebrow="Sekretariat"
      title="Data Anggota"
      description="Direktori terpusat 84 anggota — mengacu Kartu Data Anggota F-SEK-03."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <UserPlus className="mr-1.5 h-4 w-4" /> Tambah Anggota
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama, No. HP, atau wilayah…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-1.5 h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">No. HP</th>
              <th className="px-4 py-3">Wilayah</th>
              <th className="px-4 py-3">Jenjang</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {anggota.map((a) => (
              <tr key={a.hp} className="transition hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-xs font-bold text-primary-foreground">
                      {a.nama.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <span className="font-medium">{a.nama}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.hp}</td>
                <td className="px-4 py-3">{a.wilayah}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${jenjangTone[a.jenjang]}`}>
                    {a.jenjang}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      a.status === "Aktif"
                        ? "border-success/40 text-success"
                        : "border-muted-foreground/40 text-muted-foreground"
                    }
                  >
                    {a.status}
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
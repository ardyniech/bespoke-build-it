import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notulen")({
  head: () => ({ meta: [{ title: "Notulen Rapat — DRG App" }] }),
  component: NotulenPage,
});

const notulen = [
  { tgl: "12 Jul 2026", jenis: "Rapat Pengurus Bulanan", pemimpin: "Ketua Umum", notulis: "Sekretaris", poin: 8 },
  { tgl: "05 Jul 2026", jenis: "Rapat Satgas Wilayah", pemimpin: "PIC Satgas", notulis: "Bu Sulis", poin: 5 },
  { tgl: "28 Jun 2026", jenis: "Rapat Kaderisasi", pemimpin: "PIC Kaderisasi", notulis: "Cak Roni", poin: 6 },
  { tgl: "20 Jun 2026", jenis: "Rapat Anggota Tahunan", pemimpin: "Ketua Umum", notulis: "Sekretaris", poin: 14 },
];

function NotulenPage() {
  return (
    <PageShell
      eyebrow="Sekretariat"
      title="Notulen Rapat"
      description="Arsip rapat pengurus, Satgas, dan kaderisasi — versi ringkas dari SOP Rapat."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Notulen Baru
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {notulen.map((n, i) => (
          <article
            key={i}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{n.tgl}</span>
                <Badge variant="outline" className="text-[10px]">{n.poin} poin</Badge>
              </div>
              <h3 className="font-display text-base font-bold">{n.jenis}</h3>
              <div className="mt-1 text-xs text-muted-foreground">
                Dipimpin <span className="font-semibold text-foreground">{n.pemimpin}</span> · Notulis {n.notulis}
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
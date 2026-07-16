import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Siren, MapPin, Clock, Phone } from "lucide-react";

export const Route = createFileRoute("/kejadian")({
  head: () => ({ meta: [{ title: "SOS & Kejadian — DRG App" }] }),
  component: KejadianPage,
});

const kejadian = [
  {
    id: "SOS-2026-041",
    pelapor: "Mas Yanto",
    hp: "0857-8899-1122",
    lokasi: "Jl. Soekarno-Hatta, depan Indomaret Suhat",
    waktu: "16 Jul, 09:12",
    status: "Ditangani",
    kronologi: "Serempetan motor, pelapor & rekan aman, motor lecet.",
    responder: "Tim Piket Lowokwaru (3 orang)",
  },
  {
    id: "SOS-2026-040",
    pelapor: "Cak Roni",
    hp: "0898-1122-3344",
    lokasi: "Jl. S. Supriadi, Sukun",
    waktu: "14 Jul, 22:44",
    status: "Selesai",
    kronologi: "Ban bocor larut malam, minta pendamping.",
    responder: "Pak Slamet",
  },
  {
    id: "SOS-2026-039",
    pelapor: "Bu Sulis",
    hp: "0821-4433-2211",
    lokasi: "Jl. MT Haryono, Dinoyo",
    waktu: "11 Jul, 15:20",
    status: "Selesai",
    kronologi: "Penumpang bermasalah, minta pendampingan penyelesaian.",
    responder: "Cak Roni + PIC Satgas",
  },
];

const statusTone: Record<string, string> = {
  Baru: "bg-signal text-signal-foreground",
  Ditangani: "bg-warn text-warn-foreground",
  Selesai: "bg-success/20 text-success",
};

function KejadianPage() {
  return (
    <PageShell
      eyebrow="Satgas"
      title="Log Kejadian Darurat"
      description="Riwayat SOS — status Baru → Ditangani → Selesai, terhubung dengan pengajuan Dana Darurat F-BEN-05."
      actions={
        <Button size="sm" className="bg-signal text-signal-foreground shadow-warm hover:bg-signal/90">
          <Siren className="mr-1.5 h-4 w-4" /> Tekan SOS
        </Button>
      }
    >
      <div className="space-y-4">
        {kejadian.map((k) => (
          <article
            key={k.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
          >
            <div className="flex flex-col gap-4 border-b border-border p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{k.id}</span>
                  <Badge className={statusTone[k.status]}>{k.status}</Badge>
                </div>
                <h3 className="font-display text-lg font-bold">{k.pelapor}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {k.hp}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {k.waktu}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Lihat di Peta
              </Button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-2 inline-flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{k.lokasi}</span>
                </div>
                <p className="text-sm text-muted-foreground">{k.kronologi}</p>
              </div>
              <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs">
                <div className="mb-0.5 uppercase tracking-widest text-muted-foreground">
                  Responder
                </div>
                <div className="font-semibold">{k.responder}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
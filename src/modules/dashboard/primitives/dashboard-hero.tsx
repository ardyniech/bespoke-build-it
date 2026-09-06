import { Radio, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DashboardOverview } from "@/shared/models/dashboard";

interface Props {
  overview?: DashboardOverview;
}

export function DashboardHero({ overview }: Props) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-warm p-6 shadow-warm md:p-10">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
      <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <Badge className="mb-3 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
            <Radio className="mr-1.5 h-3 w-3" /> Mode Piket ·{" "}
            {overview && overview.shiftHariIni > 0 ? "aktif" : "belum ada jadwal"}
          </Badge>
          <h2 className="font-display text-2xl font-bold leading-tight text-primary-foreground md:text-4xl">
            {overview ? `${overview.shiftHariIni} Satgas siap.` : "Menyiapkan data…"}
            <br /> Komunitas terhubung sejak subuh.
          </h2>
          <p className="mt-3 max-w-lg text-sm text-primary-foreground/80 md:text-base">
            Semua rekan piket terlihat di peta wilayah masing-masing. Tekan
            tombol SOS di header kapan pun kondisi darurat.
          </p>
        </div>
        <div className="rounded-2xl bg-primary-foreground/10 p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between text-primary-foreground/80">
            <span className="text-xs uppercase tracking-widest">Kejadian aktif</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="font-display text-4xl font-bold text-primary-foreground">
            {overview ? overview.insidenAktif : "—"}
          </div>
          <div className="mt-1 text-xs text-primary-foreground/80">
            perlu respons Satgas sekarang
          </div>
          {overview && overview.menunggu > 0 && (
            <div className="mt-4 rounded-lg bg-primary-foreground/15 px-3 py-2 text-xs text-primary-foreground">
              {overview.menunggu} transaksi kas menunggu persetujuan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

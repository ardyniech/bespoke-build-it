import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/kaderisasi")({
  head: () => ({ meta: [{ title: "Evaluasi Kaderisasi — DRG App" }] }),
  component: KaderisasiPage,
});

const jenjang = [
  { nama: "Dimas Prakoso", dari: "Magang", ke: "Muda", tgl: "Minggu ini", rekomendasi: "Lanjut" },
  { nama: "Rudi Hartono", dari: "Calon", ke: "Magang", tgl: "Pekan lalu", rekomendasi: "Lanjut" },
  { nama: "Anwar Sadad", dari: "Calon", ke: "Magang", tgl: "Pekan lalu", rekomendasi: "Tinjau ulang" },
];

function KaderisasiPage() {
  return (
    <PageShell
      eyebrow="PIC Kaderisasi"
      title="Evaluasi Jenjang"
      description="Form evaluasi anggota magang & riwayat kenaikan jenjang (F-KAD-01)."
    >
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Calon", value: 12 },
          { label: "Magang", value: 6 },
          { label: "Muda / Inti", value: 66 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
            <div className="font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {jenjang.map((j) => (
          <div key={j.nama} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/25 text-accent-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{j.nama}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                {j.dari}
                <ArrowRight className="h-3 w-3" />
                <span className="font-semibold text-primary">{j.ke}</span>
                <span className="text-muted-foreground">· {j.tgl}</span>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                j.rekomendasi === "Lanjut"
                  ? "border-success/40 text-success"
                  : "border-warn/50 text-warn-foreground"
              }
            >
              {j.rekomendasi}
            </Badge>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
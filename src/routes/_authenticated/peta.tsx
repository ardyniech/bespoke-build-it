import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Radio, Shield } from "lucide-react";

export const Route = createFileRoute("/peta")({
  head: () => ({ meta: [{ title: "Peta & Lokasi — DRG App" }] }),
  component: PetaPage,
});

const rekan = [
  { nama: "Bang Parjo", wilayah: "Klojen", jarak: "0.8 km", status: "Piket" },
  { nama: "Mas Yanto", wilayah: "Lowokwaru", jarak: "2.1 km", status: "SOS" },
  { nama: "Cak Roni", wilayah: "Sukun", jarak: "3.4 km", status: "Piket" },
  { nama: "Bu Sulis", wilayah: "Lowokwaru", jarak: "3.9 km", status: "Piket" },
];

function PetaPage() {
  return (
    <PageShell
      eyebrow="Satgas"
      title="Peta & Lokasi Real-time"
      description="Leaflet + OpenStreetMap · tanpa Google. Lokasi share bersifat opt-in dan time-boxed sesuai prinsip privasi minimal."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Radio className="mr-1.5 h-4 w-4" /> Bagikan Lokasi Saya
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:aspect-auto lg:min-h-[520px]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 40%, oklch(0.94 0.03 70) 0%, transparent 40%), radial-gradient(circle at 70% 60%, oklch(0.91 0.04 75) 0%, transparent 45%), linear-gradient(135deg, oklch(0.96 0.02 80), oklch(0.92 0.03 70))",
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, oklch(0.85 0.02 70 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.85 0.02 70 / 0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {[
            { top: "28%", left: "34%", tone: "signal" },
            { top: "52%", left: "58%", tone: "primary" },
            { top: "44%", left: "22%", tone: "primary" },
            { top: "68%", left: "70%", tone: "primary" },
            { top: "38%", left: "76%", tone: "accent" },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: p.top, left: p.left }}
            >
              <div
                className={
                  "relative grid h-8 w-8 place-items-center rounded-full text-white shadow-warm " +
                  (p.tone === "signal"
                    ? "bg-signal animate-pulse"
                    : p.tone === "accent"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary")
                }
              >
                <MapPin className="h-4 w-4" />
              </div>
            </div>
          ))}
          <div className="absolute bottom-4 left-4 rounded-xl bg-card/90 px-3 py-2 text-[11px] font-medium text-muted-foreground backdrop-blur">
            © OpenStreetMap contributors · Leaflet · tanpa Google
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Rekan Terdekat</h3>
            <Badge className="bg-accent/25 text-accent-foreground">Mode Piket</Badge>
          </div>
          <ul className="space-y-2">
            {rekan.map((r) => (
              <li
                key={r.nama}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "grid h-9 w-9 place-items-center rounded-full text-white " +
                      (r.status === "SOS" ? "bg-signal" : "bg-primary")
                    }
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{r.nama}</div>
                    <div className="text-xs text-muted-foreground">{r.wilayah}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-semibold text-foreground">{r.jarak}</div>
                  <div
                    className={
                      "text-[10px] font-semibold uppercase tracking-wider " +
                      (r.status === "SOS" ? "text-signal" : "text-muted-foreground")
                    }
                  >
                    {r.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-primary">Privasi:</span> lokasi
              hanya aktif saat Piket atau Mode Darurat. Otomatis mati saat shift
              selesai atau kejadian ditutup.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
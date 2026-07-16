import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Wallet,
  Siren,
  CalendarClock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Radio,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const stats = [
  { label: "Anggota Aktif", value: "84", delta: "+6 bulan ini", icon: Users, to: "/anggota" },
  { label: "Saldo Kas Sosial", value: "Rp 4.820.000", delta: "+Rp 640rb", icon: Wallet, to: "/kas" },
  { label: "Kejadian Bulan Ini", value: "3", delta: "1 ditangani", icon: Siren, to: "/kejadian" },
  { label: "Piket Aktif", value: "7", delta: "5 wilayah", icon: CalendarClock, to: "/piket" },
];

const feed = [
  { time: "09:12", tag: "SOS", tone: "signal", text: "Pak Yanto — serempetan di Jl. Soekarno-Hatta. Status: ditangani." },
  { time: "08:40", tag: "Kas", tone: "success", text: "Setoran iuran mingguan Wilayah Blimbing: Rp 240.000." },
  { time: "07:55", tag: "Piket", tone: "accent", text: "Shift pagi Satgas Kedungkandang mulai (4 personil)." },
  { time: "Kemarin", tag: "Kaderisasi", tone: "muted", text: "2 calon anggota menyelesaikan screening — menunggu review." },
];

function Dashboard() {
  return (
    <PageShell
      eyebrow="Dashboard komunitas"
      title="Selamat pagi, Bang Parjo"
      description="Ringkasan operasional DRG hari ini — kas, kejadian, dan piket dalam satu layar."
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link to="/kas">Catat Transaksi</Link>
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link to="/kejadian">Buka Log Kejadian</Link>
          </Button>
        </>
      }
    >
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-warm p-6 shadow-warm md:p-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <Badge className="mb-3 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
              <Radio className="mr-1.5 h-3 w-3" /> Mode Piket · aktif
            </Badge>
            <h2 className="font-display text-2xl font-bold leading-tight text-primary-foreground md:text-4xl">
              7 Satgas siap.<br /> Komunitas terhubung sejak subuh.
            </h2>
            <p className="mt-3 max-w-lg text-sm text-primary-foreground/80 md:text-base">
              Semua rekan piket terlihat di peta wilayah masing-masing. Tekan
              tombol SOS di header kapan pun kondisi darurat.
            </p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/10 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-primary-foreground/80">
              <span className="text-xs uppercase tracking-widest">Respons SOS</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="font-display text-4xl font-bold text-primary-foreground">
              1m 42s
            </div>
            <div className="mt-1 text-xs text-primary-foreground/80">
              rata-rata pekan ini · target &lt; 2 menit
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/15">
              <div className="h-full w-[78%] rounded-full bg-primary-foreground/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="group rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-[11px] font-medium text-success">{s.delta}</div>
          </Link>
        ))}
      </div>

      {/* Activity + Piket */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Aktivitas Terkini</h3>
            <Button variant="ghost" size="sm" className="text-xs">
              Lihat semua
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {feed.map((f, i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <span className="w-14 shrink-0 text-xs font-mono text-muted-foreground">
                  {f.time}
                </span>
                <span
                  className={
                    "inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider " +
                    (f.tone === "signal"
                      ? "bg-signal/15 text-signal"
                      : f.tone === "success"
                        ? "bg-success/15 text-success"
                        : f.tone === "accent"
                          ? "bg-accent/25 text-accent-foreground"
                          : "bg-muted text-muted-foreground")
                  }
                >
                  {f.tag}
                </span>
                <span className="text-sm text-foreground">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Piket Hari Ini</h3>
            <Badge variant="outline" className="text-[10px]">5 wilayah</Badge>
          </div>
          <ul className="space-y-3">
            {[
              { wilayah: "Kedungkandang", personil: 4, waktu: "06:00 – 12:00" },
              { wilayah: "Blimbing", personil: 2, waktu: "06:00 – 12:00" },
              { wilayah: "Klojen", personil: 3, waktu: "12:00 – 18:00" },
              { wilayah: "Sukun", personil: 2, waktu: "18:00 – 00:00" },
              { wilayah: "Lowokwaru", personil: 3, waktu: "18:00 – 00:00" },
            ].map((p) => (
              <li
                key={p.wilayah}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">{p.wilayah}</div>
                    <div className="text-xs text-muted-foreground">{p.waktu}</div>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {p.personil} personil
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

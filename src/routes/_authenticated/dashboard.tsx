import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Komunitas — DRG App" },
      {
        name: "description",
        content:
          "Ringkasan operasional DRG: anggota aktif, saldo kas, kejadian bulan ini, dan jadwal piket hari ini.",
      },
      { property: "og:title", content: "Dashboard Komunitas — DRG App" },
      {
        property: "og:description",
        content: "Ringkasan operasional komunitas DRG dalam satu layar.",
      },
    ],
  }),
  component: Dashboard,
});

const SLOT_TIME: Record<string, string> = {
  pagi: "06:00 – 12:00",
  siang: "12:00 – 18:00",
  malam: "18:00 – 00:00",
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const jam = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function Dashboard() {
  const { user } = Route.useRouteContext();
  const today = isoDate(new Date());
  const monthStart = isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-overview", today],
    staleTime: 30_000,
    queryFn: async () => {
      const [anggota, kas, kejadian, piket] = await Promise.all([
        supabase.from("profiles").select("id, status"),
        supabase.from("kas_transactions").select("jenis, jumlah, kategori, deskripsi, tanggal, status, created_at"),
        supabase.from("kejadian").select("id, tipe, status, deskripsi, alamat_text, dibuat_at").order("dibuat_at", { ascending: false }).limit(20),
        supabase.from("piket_shifts").select("id, tanggal, slot, wilayah, user_id").eq("tanggal", today),
      ]);

      const profiles = anggota.data ?? [];
      const trx = (kas.data ?? []).filter((t) => t.status === "disetujui");
      const saldo = trx.reduce((acc, t) => acc + (t.jenis === "masuk" ? Number(t.jumlah) : -Number(t.jumlah)), 0);
      const masukBulanIni = trx
        .filter((t) => t.tanggal >= monthStart)
        .reduce((acc, t) => acc + (t.jenis === "masuk" ? Number(t.jumlah) : 0), 0);
      const menunggu = (kas.data ?? []).filter((t) => t.status === "menunggu").length;

      const insiden = kejadian.data ?? [];
      const insidenBulanIni = insiden.filter((k) => k.dibuat_at >= monthStart);
      const insidenAktif = insiden.filter((k) => k.status !== "closed");

      const shifts = piket.data ?? [];
      const perWilayah = new Map<string, { wilayah: string; slot: string; personil: number }>();
      for (const s of shifts) {
        const key = `${s.wilayah}|${s.slot}`;
        const prev = perWilayah.get(key);
        perWilayah.set(key, { wilayah: s.wilayah, slot: s.slot, personil: (prev?.personil ?? 0) + 1 });
      }

      const feed = [
        ...insiden.slice(0, 5).map((k) => ({
          at: k.dibuat_at,
          tag: "SOS",
          tone: "signal" as const,
          text: `${k.tipe.toUpperCase()} — ${k.alamat_text || k.deskripsi || "tanpa keterangan"} · ${k.status}`,
        })),
        ...trx
          .slice()
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, 5)
          .map((t) => ({
            at: t.created_at,
            tag: "Kas",
            tone: (t.jenis === "masuk" ? "success" : "muted") as "success" | "muted",
            text: `${t.jenis === "masuk" ? "Pemasukan" : "Pengeluaran"} ${t.kategori}: ${rupiah(Number(t.jumlah))}`,
          })),
      ]
        .sort((a, b) => (a.at < b.at ? 1 : -1))
        .slice(0, 8);

      return {
        anggotaAktif: profiles.filter((p) => p.status === "aktif").length,
        anggotaTotal: profiles.length,
        saldo,
        masukBulanIni,
        menunggu,
        insidenBulanIni: insidenBulanIni.length,
        insidenAktif: insidenAktif.length,
        shiftHariIni: shifts.length,
        wilayahHariIni: new Set(shifts.map((s) => s.wilayah)).size,
        piket: [...perWilayah.values()].sort((a, b) => a.wilayah.localeCompare(b.wilayah)),
        feed,
      };
    },
  });

  const stats = [
    {
      label: "Anggota Aktif",
      value: overview ? String(overview.anggotaAktif) : "—",
      delta: overview ? `dari ${overview.anggotaTotal} terdata` : "",
      icon: Users,
      to: "/anggota" as const,
    },
    {
      label: "Saldo Kas",
      value: overview ? rupiah(overview.saldo) : "—",
      delta: overview ? `+${rupiah(overview.masukBulanIni)} bulan ini` : "",
      icon: Wallet,
      to: "/kas" as const,
    },
    {
      label: "Kejadian Bulan Ini",
      value: overview ? String(overview.insidenBulanIni) : "—",
      delta: overview ? `${overview.insidenAktif} masih aktif` : "",
      icon: Siren,
      to: "/kejadian" as const,
    },
    {
      label: "Piket Hari Ini",
      value: overview ? String(overview.shiftHariIni) : "—",
      delta: overview ? `${overview.wilayahHariIni} wilayah` : "",
      icon: CalendarClock,
      to: "/piket" as const,
    },
  ];

  const displayName =
    profile?.nama?.split(" ")[0] ||
    user?.user_metadata?.nama ||
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Rekan";
  const hour = new Date().getHours();
  const salam =
    hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
  return (
    <PageShell
      eyebrow="Dashboard komunitas"
      title={`${salam}, ${displayName}`}
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

      {isError && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-signal">
          <span>Gagal memuat ringkasan.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

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
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link to="/kejadian">Lihat semua</Link>
            </Button>
          </div>
          {isLoading && <p className="py-6 text-sm text-muted-foreground">Memuat aktivitas…</p>}
          {!isLoading && overview?.feed.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">
              Belum ada aktivitas tercatat. Kejadian dan transaksi kas akan muncul di sini.
            </p>
          )}
          <ul className="divide-y divide-border">
            {(overview?.feed ?? []).map((f, i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <span className="w-14 shrink-0 text-xs font-mono text-muted-foreground">
                  {jam(f.at)}
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
            <Badge variant="outline" className="text-[10px]">
              {overview?.wilayahHariIni ?? 0} wilayah
            </Badge>
          </div>
          {!isLoading && (overview?.piket.length ?? 0) === 0 && (
            <p className="py-6 text-sm text-muted-foreground">
              Belum ada jadwal piket untuk hari ini.{" "}
              <Link to="/piket" className="font-medium text-primary underline-offset-2 hover:underline">
                Atur jadwal
              </Link>
            </p>
          )}
          <ul className="space-y-3">
            {(overview?.piket ?? []).map((p) => (
              <li
                key={`${p.wilayah}-${p.slot}`}
                className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">{p.wilayah}</div>
                    <div className="text-xs text-muted-foreground">
                      {SLOT_TIME[p.slot] ?? p.slot}
                    </div>
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

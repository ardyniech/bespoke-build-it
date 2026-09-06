import { Link } from "@tanstack/react-router";
import { Users, Wallet, Siren, CalendarClock, ArrowUpRight } from "lucide-react";
import { formatRupiah } from "@/shared/utils/formatters";
import type { DashboardOverview } from "@/shared/models/dashboard";

interface Props {
  overview?: DashboardOverview;
}

export function DashboardStats({ overview }: Props) {
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
      value: overview ? formatRupiah(overview.saldo) : "—",
      delta: overview ? `+${formatRupiah(overview.masukBulanIni)} bulan ini` : "",
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

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Link
          key={s.label}
          to={s.to}
          className="group relative rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase tracking-wider">{s.label}</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <s.icon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 font-display text-2xl font-bold text-foreground">
            {s.value}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{s.delta}</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
          </div>
        </Link>
      ))}
    </div>
  );
}

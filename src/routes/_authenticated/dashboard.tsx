import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  useDashboardOverview,
  DashboardHero,
  DashboardStats,
  DashboardPiketGrid,
  DashboardActivityFeed,
} from "@/modules/dashboard";
import {
  useCommunityProgress,
  ProgressiveOnboardingCard,
} from "@/modules/onboarding";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Komunitas — DRG App" },
      {
        name: "description",
        content: "Ringkasan operasional DRG: anggota aktif, saldo kas, kejadian bulan ini, dan jadwal piket hari ini.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: overview, isError, refetch } = useDashboardOverview();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nama, role, pangkalan").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const progress = useCommunityProgress({
    hasCompletedProfile: Boolean(profile?.pangkalan && profile?.nama),
    hasShifts: Boolean((overview?.shiftHariIni ?? 0) > 0),
    hasTransactions: Boolean((overview?.saldo ?? 0) > 0 || (overview?.masukBulanIni ?? 0) > 0),
    role: profile?.role ?? null,
  });

  const displayName = profile?.nama?.split(" ")[0] || user?.user_metadata?.nama || "Rekan Driver";
  const hour = new Date().getHours();
  const salam = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <PageShell
      eyebrow="Dashboard komunitas"
      title={`${salam}, ${displayName}`}
      description="Ringkasan operasional DRG hari ini — kas, kejadian, dan piket dalam satu layar terkoordinasi."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/kas">Catat Transaksi</Link>
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link to="/kejadian">Buka Log Kejadian</Link>
          </Button>
        </div>
      }
    >
      <ProgressiveOnboardingCard
        level={progress.currentLevel}
        progressPercent={progress.progressPercent}
        nextMission={progress.nextMission}
        roleTitle={progress.roleTitle}
      />

      <DashboardHero overview={overview} />

      {isError && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-signal">
          <span>Gagal memuat ringkasan data operasional.</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      )}

      <DashboardStats overview={overview} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPiketGrid piket={overview?.piket ?? []} />
        <DashboardActivityFeed feed={overview?.feed ?? []} />
      </div>
    </PageShell>
  );
}

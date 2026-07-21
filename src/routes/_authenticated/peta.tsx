import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientOnly } from "@tanstack/react-router";
import { Loader2, LocateFixed, RadioTower } from "lucide-react";
import type { MapPoint } from "@/components/live-map";

const LiveMap = lazy(() => import("@/components/live-map"));

export const Route = createFileRoute("/_authenticated/peta")({
  head: () => ({ meta: [{ title: "Peta & Lokasi — DRG App" }] }),
  component: PetaPage,
});

type LiveRow = {
  user_id: string;
  lat: number;
  lng: number;
  on_bit: boolean;
  last_seen: string;
  nama?: string | null;
};

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}d lalu`;
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)}j lalu`;
  return `${Math.floor(s / 86400)}h lalu`;
}

function PetaPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [showOffline, setShowOffline] = useState(false);
  const [focusMe, setFocusMe] = useState<string | undefined>(undefined);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["live-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_locations")
        .select("user_id, lat, lng, on_bit, last_seen")
        .order("last_seen", { ascending: false });
      if (error) throw error;
      const locs = (data ?? []) as LiveRow[];
      const ids = locs.map((l) => l.user_id);
      if (ids.length === 0) return locs;
      const { data: profs } = await supabase.from("profiles").select("id, nama").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p.nama]));
      return locs.map((l) => ({ ...l, nama: map.get(l.user_id) ?? null }));
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("live_locations_map")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations" }, () =>
        qc.invalidateQueries({ queryKey: ["live-locations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const activeCount = rows.filter((r) => r.on_bit).length;
  const visible = useMemo(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    return rows.filter((r) =>
      showOffline ? new Date(r.last_seen).getTime() > cutoff : r.on_bit,
    );
  }, [rows, showOffline]);

  const points: MapPoint[] = visible.map((r) => ({
    id: r.user_id,
    lat: r.lat,
    lng: r.lng,
    label: `${r.nama ?? "Anggota"}${r.user_id === user?.id ? " (Anda)" : ""}`,
    sub: `${r.on_bit ? "On-Bit" : "Off-Bit"} · ${timeAgo(r.last_seen)}`,
    variant: r.user_id === user?.id ? "me" : r.on_bit ? "active" : "idle",
  }));

  return (
    <PageShell
      eyebrow="Satgas"
      title="Peta & Lokasi Real-time"
      description="Live lokasi rekan yang sedang On-Bit. Toggle Off-Bit di header saat selesai bertugas."
      actions={
        <div className="flex items-center gap-2">
          <Badge className="bg-success/15 text-success">
            <RadioTower className="mr-1.5 h-3 w-3" /> {activeCount} On-Bit
          </Badge>
          <Button
            size="sm"
            variant={showOffline ? "default" : "outline"}
            onClick={() => setShowOffline((v) => !v)}
          >
            {showOffline ? "Semua (30 mnt)" : "Hanya On-Bit"}
          </Button>
          {user?.id && rows.some((r) => r.user_id === user.id) && (
            <Button size="sm" variant="outline" onClick={() => setFocusMe(user.id + ":" + Date.now())}>
              <LocateFixed className="mr-1.5 h-4 w-4" /> Saya
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:aspect-auto lg:min-h-[520px]">
          <ClientOnly fallback={<div className="grid h-full place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
            <Suspense fallback={<div className="grid h-full place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
              <LiveMap
                points={points}
                focusId={focusMe ? focusMe.split(":")[0] : undefined}
                height="100%"
              />
            </Suspense>
          </ClientOnly>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Rekan</h3>
            <Badge className="bg-accent/25 text-accent-foreground">{visible.length}</Badge>
          </div>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
          ) : (
            <ul className="space-y-2">
              {rows.length === 0 ? (
                <li className="rounded-xl bg-muted/50 px-3 py-4 text-center text-xs text-muted-foreground">
                  Belum ada data lokasi.
                </li>
              ) : (
                rows.map((r) => {
                  const isMe = r.user_id === user?.id;
                  return (
                    <li
                      key={r.user_id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {r.nama ?? "Anggota"}
                          {isMe && <span className="ml-1 text-xs text-muted-foreground">(Anda)</span>}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">{timeAgo(r.last_seen)}</div>
                        <div
                          className={
                            "text-[10px] font-semibold uppercase tracking-wider " +
                            (r.on_bit ? "text-success" : "text-muted-foreground")
                          }
                        >
                          {r.on_bit ? "On-Bit" : "Off"}
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          <div className="mt-5 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Aturan komunitas:</span> selama ngebit
            (On-Bit) lokasi live wajib dibagikan agar Satgas siap membantu.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
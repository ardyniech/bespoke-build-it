import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { MapPin, Shield, RadioTower } from "lucide-react";

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: rows = [] } = useQuery({
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
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nama")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p.nama]));
      return locs.map((l) => ({ ...l, nama: map.get(l.user_id) ?? null }));
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("live_locations_map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations" },
        () => qc.invalidateQueries({ queryKey: ["live-locations"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const me = rows.find((r) => r.user_id === user?.id);
  const others = rows.filter((r) => r.user_id !== user?.id && r.on_bit);
  const activeCount = rows.filter((r) => r.on_bit).length;

  const pts = [...(me ? [me] : []), ...others];
  const bbox =
    pts.length > 0
      ? {
          minLat: Math.min(...pts.map((p) => p.lat)) - 0.005,
          maxLat: Math.max(...pts.map((p) => p.lat)) + 0.005,
          minLng: Math.min(...pts.map((p) => p.lng)) - 0.005,
          maxLng: Math.max(...pts.map((p) => p.lng)) + 0.005,
        }
      : null;
  const project = (lat: number, lng: number) => {
    if (!bbox) return { top: "50%", left: "50%" };
    const y = ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * 100;
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * 100;
    return { top: `${y}%`, left: `${x}%` };
  };

  return (
    <PageShell
      eyebrow="Satgas"
      title="Peta & Lokasi Real-time"
      description="Live lokasi rekan yang sedang On-Bit. Aturan komunitas DRG: lokasi otomatis dibagikan saat ngebit — toggle Off-Bit di header saat selesai bertugas."
      actions={
        <Badge className="bg-success/15 text-success">
          <RadioTower className="mr-1.5 h-3 w-3" /> {activeCount} rekan On-Bit
        </Badge>
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
          {pts.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
              <div>
                <p className="font-semibold">Belum ada rekan yang On-Bit.</p>
                <p className="mt-1 text-xs">Aktifkan On-Bit di header untuk mulai share lokasi.</p>
              </div>
            </div>
          ) : (
            pts.map((p) => {
              const pos = project(p.lat, p.lng);
              const isMe = p.user_id === user?.id;
              return (
                <div
                  key={p.user_id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pos.top, left: pos.left }}
                  title={`${p.nama ?? "Anggota"} · ${timeAgo(p.last_seen)}`}
                >
                  <div
                    className={
                      "relative grid h-8 w-8 place-items-center rounded-full text-white shadow-warm " +
                      (isMe
                        ? "bg-accent text-accent-foreground animate-pulse"
                        : p.on_bit
                          ? "bg-primary"
                          : "bg-muted-foreground")
                    }
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                </div>
              );
            })
          )}
          <div className="absolute bottom-4 left-4 rounded-xl bg-card/90 px-3 py-2 text-[11px] font-medium text-muted-foreground backdrop-blur">
            Live GPS · update tiap 15 detik · diperbarui {new Date(now).toLocaleTimeString("id-ID")}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Rekan Terdekat</h3>
            <Badge className="bg-accent/25 text-accent-foreground">On-Bit</Badge>
          </div>
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
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          "grid h-9 w-9 place-items-center rounded-full text-white " +
                          (r.on_bit ? "bg-primary" : "bg-muted-foreground")
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {r.nama ?? "Anggota"}
                          {isMe && (
                            <span className="ml-1 text-xs text-muted-foreground">(Anda)</span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                        </div>
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
          <div className="mt-5 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-primary">Aturan komunitas:</span> selama ngebit
              (On-Bit) lokasi live wajib dibagikan agar rekan Satgas siap membantu. Toggle Off-Bit
              di header saat selesai bertugas.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
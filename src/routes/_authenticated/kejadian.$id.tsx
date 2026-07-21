import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, lazy, Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft, Clock, Loader2, MapPin, Users, Check, X, Handshake, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { useIs } from "@/hooks/use-my-role";

const LiveMap = lazy(() => import("@/components/live-map"));

export const Route = createFileRoute("/_authenticated/kejadian/$id")({
  head: () => ({ meta: [{ title: "Detail Kejadian — DRG" }] }),
  component: KejadianDetail,
});

const statusTone: Record<string, string> = {
  open: "bg-signal text-signal-foreground",
  on_progress: "bg-warn text-warn-foreground",
  closed: "bg-success/20 text-success",
};
const statusLabel: Record<string, string> = { open: "Baru", on_progress: "Ditangani", closed: "Selesai" };

function KejadianDetail() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isSatgas = useIs("satgas");

  const { data: k, isLoading } = useQuery({
    queryKey: ["kejadian", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("kejadian").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: responders = [] } = useQuery({
    queryKey: ["kejadian-responders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kejadian_responders")
        .select("user_id, joined_at")
        .eq("kejadian_id", id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, nama, no_hp").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((r) => ({ ...r, profile: map.get(r.user_id) }));
    },
  });

  const { data: pelapor } = useQuery({
    queryKey: ["pelapor", k?.pelapor_id],
    enabled: !!k?.pelapor_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nama, no_hp").eq("id", k!.pelapor_id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`kejadian-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kejadian", filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["kejadian", id] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kejadian_responders", filter: `kejadian_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["kejadian-responders", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  const iAmIn = responders.some((r) => r.user_id === user?.id);

  const join = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Butuh sesi");
      const { error } = await supabase
        .from("kejadian_responders")
        .insert({ kejadian_id: id, user_id: user.id });
      if (error) throw error;
      if (k?.status === "open") {
        await supabase.from("kejadian").update({ status: "on_progress" }).eq("id", id);
      }
    },
    onSuccess: () => toast.success("Kamu ikut respons — hati-hati di jalan"),
    onError: (e: Error) => toast.error(e.message),
  });

  const leave = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("kejadian_responders")
        .delete()
        .eq("kejadian_id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => toast.message("Batal respons"),
  });

  const close = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("kejadian")
        .update({ status: "closed", ditutup_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Kejadian ditutup"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }
  if (!k) {
    return (
      <PageShell title="Kejadian tidak ditemukan">
        <Button asChild variant="outline"><Link to="/kejadian"><ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali</Link></Button>
      </PageShell>
    );
  }

  const points = k.lokasi_lat && k.lokasi_lng
    ? [{
        id: k.id,
        lat: Number(k.lokasi_lat),
        lng: Number(k.lokasi_lng),
        label: `Lokasi ${k.tipe.toUpperCase()}`,
        sub: k.alamat_text ?? undefined,
        variant: "sos" as const,
      }]
    : [];

  return (
    <PageShell
      eyebrow={`Kejadian · ${k.tipe.toUpperCase()}`}
      title={k.deskripsi || "Tanpa deskripsi"}
      description={`Dilaporkan ${new Date(k.dibuat_at).toLocaleString("id-ID")}`}
      actions={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/kejadian" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Log
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={statusTone[k.status]}>{statusLabel[k.status]}</Badge>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                <Users className="h-3 w-3" /> {responders.length} responder
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {new Date(k.dibuat_at).toLocaleString("id-ID")}
              </span>
            </div>
            {k.alamat_text && (
              <div className="mb-3 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {k.alamat_text}
              </div>
            )}
            {k.lokasi_lat && k.lokasi_lng && (
              <a
                href={`https://www.google.com/maps?q=${k.lokasi_lat},${k.lokasi_lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-semibold text-primary hover:underline"
              >
                Buka di Google Maps ({Number(k.lokasi_lat).toFixed(4)}, {Number(k.lokasi_lng).toFixed(4)})
              </a>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {k.status !== "closed" && (
                iAmIn ? (
                  <Button variant="outline" onClick={() => leave.mutate()} disabled={leave.isPending}>
                    <X className="mr-1.5 h-4 w-4" /> Batalkan respons
                  </Button>
                ) : (
                  <Button
                    onClick={() => join.mutate()}
                    disabled={join.isPending}
                    className="bg-signal text-signal-foreground hover:bg-signal/90"
                  >
                    <Handshake className="mr-1.5 h-4 w-4" /> Saya respons
                  </Button>
                )
              )}
              {isSatgas && k.status !== "closed" && (
                <Button variant="outline" onClick={() => close.mutate()} disabled={close.isPending}>
                  <Check className="mr-1.5 h-4 w-4" /> Tutup kejadian
                </Button>
              )}
              {pelapor?.no_hp && (
                <Button variant="outline" asChild>
                  <a href={`tel:${pelapor.no_hp}`}>
                    <PhoneCall className="mr-1.5 h-4 w-4" /> Telepon pelapor
                  </a>
                </Button>
              )}
            </div>
          </div>

          {points.length > 0 && (
            <div className="h-72 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <ClientOnly fallback={<div className="grid h-full place-items-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
                <Suspense fallback={<div className="grid h-full place-items-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
                  <LiveMap points={points} height="100%" />
                </Suspense>
              </ClientOnly>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 font-display text-lg font-bold">Pelapor</h3>
            <div className="text-sm font-semibold">{pelapor?.nama ?? "—"}</div>
            {pelapor?.no_hp && <div className="text-xs text-muted-foreground">{pelapor.no_hp}</div>}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 font-display text-lg font-bold">Timeline responder</h3>
            {responders.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada yang respons. Ketuk “Saya respons” di atas.</p>
            ) : (
              <ol className="space-y-3">
                {responders.map((r, i) => (
                  <li key={r.user_id} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {i + 1}. {r.profile?.nama ?? "Anggota"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(r.joined_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                    {r.profile?.no_hp && (
                      <a
                        href={`tel:${r.profile.no_hp}`}
                        className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
                      >
                        Telp
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
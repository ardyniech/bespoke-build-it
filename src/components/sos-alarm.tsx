import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Siren, MapPin, Navigation, HandHelping, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Incoming = {
  id: string;
  tipe: string;
  deskripsi: string | null;
  alamat_text: string | null;
  lokasi_lat: number | null;
  lokasi_lng: number | null;
  pelapor_id: string;
  dibuat_at: string;
};

const TIPE_LABEL: Record<string, string> = {
  sos: "SOS Umum",
  laka: "Kecelakaan",
  mogok: "Mogok",
  lain: "Lain-lain",
};

/** Two-tone siren via WebAudio; returns a stop function. */
function startSiren(): () => void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    let hi = false;
    const iv = window.setInterval(() => {
      hi = !hi;
      osc.frequency.setValueAtTime(hi ? 960 : 640, ctx.currentTime);
    }, 450);
    // Auto-stop after 30s so it never blares forever
    const to = window.setTimeout(() => stop(), 30_000);
    function stop() {
      window.clearInterval(iv);
      window.clearTimeout(to);
      try { osc.stop(); } catch { /* noop */ }
      void ctx.close();
    }
    return stop;
  } catch {
    return () => {};
  }
}

export function SosAlarm({ userId }: { userId: string | undefined }) {
  const [alert, setAlert] = useState<Incoming | null>(null);
  const [pelapor, setPelapor] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("sos-alarm-global")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kejadian" }, (payload) => {
        const k = payload.new as Incoming;
        if (k.pelapor_id === userId) return;
        stopRef.current();
        stopRef.current = startSiren();
        if ("vibrate" in navigator) navigator.vibrate([400, 200, 400, 200, 800]);
        setAlert(k);
        setPelapor(null);
        void supabase
          .from("profiles")
          .select("nama")
          .eq("id", k.pelapor_id)
          .maybeSingle()
          .then(({ data }) => setPelapor(data?.nama ?? null));
      })
      .subscribe();
    return () => {
      stopRef.current();
      supabase.removeChannel(ch);
    };
  }, [userId]);

  const dismiss = () => {
    stopRef.current();
    if ("vibrate" in navigator) navigator.vibrate(0);
    setAlert(null);
  };

  const respond = async () => {
    if (!alert || !userId) return;
    setJoining(true);
    const { error } = await supabase
      .from("kejadian_responders")
      .insert({ kejadian_id: alert.id, user_id: userId });
    setJoining(false);
    if (error && error.code !== "23505") {
      toast.error("Gagal merespons", { description: error.message });
      return;
    }
    toast.success("Kamu tercatat sebagai responder");
    qc.invalidateQueries({ queryKey: ["kejadian-responder-counts"] });
    const id = alert.id;
    dismiss();
    void navigate({ to: "/kejadian/$id", params: { id } });
  };

  if (!alert) return null;
  const hasCoords = alert.lokasi_lat != null && alert.lokasi_lng != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${alert.lokasi_lat},${alert.lokasi_lng}`
    : null;

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="sos-alarm-title" className="fixed inset-0 z-[100] grid place-items-center bg-signal/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-warm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-signal text-signal-foreground">
              <Siren className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-signal">Panggilan darurat</div>
              <h2 id="sos-alarm-title" className="font-display text-2xl font-bold">
                {TIPE_LABEL[alert.tipe] ?? alert.tipe}
              </h2>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="Tutup alarm" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div><span className="text-muted-foreground">Pelapor: </span><b>{pelapor ?? "Rekan DRG"}</b></div>
          {alert.alamat_text && (
            <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{alert.alamat_text}</div>
          )}
          {alert.deskripsi && <p className="rounded-lg bg-muted/60 p-3">{alert.deskripsi}</p>}
          <div className="text-xs text-muted-foreground">{new Date(alert.dibuat_at).toLocaleTimeString("id-ID")}</div>
        </div>

        <div className="mt-5 grid gap-2">
          <Button size="lg" onClick={respond} disabled={joining} className="h-14 bg-signal text-lg text-signal-foreground hover:bg-signal/90">
            {joining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <HandHelping className="mr-2 h-5 w-5" />}
            Saya meluncur
          </Button>
          <div className="grid grid-cols-2 gap-2">
            {mapsUrl ? (
              <Button asChild variant="outline">
                <a href={mapsUrl} target="_blank" rel="noreferrer"><Navigation className="mr-1.5 h-4 w-4" /> Rute</a>
              </Button>
            ) : (
              <Button variant="outline" disabled><Navigation className="mr-1.5 h-4 w-4" /> Tanpa GPS</Button>
            )}
            <Button
              variant="outline"
              onClick={() => { const id = alert.id; dismiss(); void navigate({ to: "/kejadian/$id", params: { id } }); }}
            >
              Lihat detail
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss}>Matikan alarm</Button>
        </div>
      </div>
    </div>
  );
}

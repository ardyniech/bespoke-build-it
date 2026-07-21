import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useIs } from "@/hooks/use-my-role";

export const Route = createFileRoute("/_authenticated/piket")({
  head: () => ({ meta: [{ title: "Piket Satgas — DRG App" }] }),
  component: PiketPage,
});

type Shift = {
  id: string;
  tanggal: string;
  slot: "pagi" | "siang" | "malam";
  wilayah: string | null;
  user_id: string | null;
  catatan: string | null;
};
type Swap = {
  id: string;
  shift_id: string;
  requested_by: string;
  target_user_id: string | null;
  status: string;
  alasan: string | null;
  created_at: string;
};

const slots: Shift["slot"][] = ["pagi", "siang", "malam"];

function PiketPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const canManage = useIs("satgas") || useIs("admin");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const fromIso = toIso(days[0]);
  const toIsoEnd = toIso(days[6]);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["piket", fromIso, toIsoEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("piket_shifts")
        .select("*")
        .gte("tanggal", fromIso)
        .lte("tanggal", toIsoEnd);
      if (error) throw error;
      return data as Shift[];
    },
  });

  const { data: profileMap = {} } = useQuery({
    queryKey: ["piket-profiles", shifts.map((s) => s.user_id).join(",")],
    enabled: shifts.length > 0,
    queryFn: async () => {
      const ids = [...new Set(shifts.map((s) => s.user_id).filter(Boolean))] as string[];
      if (!ids.length) return {};
      const { data } = await supabase.from("profiles").select("id, nama").in("id", ids);
      const m: Record<string, string> = {};
      (data ?? []).forEach((p) => {
        m[p.id] = p.nama ?? "";
      });
      return m;
    },
  });

  const { data: mySwaps = [] } = useQuery({
    queryKey: ["piket-swaps", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("piket_swap_requests")
        .select("*")
        .or(`requested_by.eq.${user!.id},target_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Swap[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("piket-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "piket_shifts" }, () =>
        qc.invalidateQueries({ queryKey: ["piket"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "piket_swap_requests" }, () =>
        qc.invalidateQueries({ queryKey: ["piket-swaps"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const respondSwap = useMutation({
    mutationFn: async ({ id, accept, shiftId, requestedBy }: { id: string; accept: boolean; shiftId: string; requestedBy: string }) => {
      const status = accept ? "diterima" : "ditolak";
      const { error } = await supabase
        .from("piket_swap_requests")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (accept) {
        // pindahkan user_id shift dari pemilik lama ke penerima
        await supabase.from("piket_shifts").update({ user_id: requestedBy === user!.id ? null : user!.id }).eq("id", shiftId);
      }
    },
    onSuccess: () => toast.success("Permintaan diperbarui"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell
      eyebrow="Satgas"
      title="Jadwal Piket"
      description="Kelola shift mingguan, ajukan tukar shift, dan pantau permintaan."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Minggu lalu</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Hari ini</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>Minggu depan →</Button>
          {canManage && <NewShiftDialog defaultDate={fromIso} onDone={() => qc.invalidateQueries({ queryKey: ["piket"] })} />}
        </div>
      }
    >
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider">
          <div className="p-3 text-muted-foreground">Slot</div>
          {days.map((d) => (
            <div key={d.toISOString()} className="p-3 text-center">
              <div>{d.toLocaleDateString("id-ID", { weekday: "short" })}</div>
              <div className="text-muted-foreground">{d.getDate()}</div>
            </div>
          ))}
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
        ) : (
          slots.map((slot) => (
            <div key={slot} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border/60 last:border-0">
              <div className="p-3 text-xs font-semibold capitalize text-muted-foreground">{slot}</div>
              {days.map((d) => {
                const iso = toIso(d);
                const s = shifts.find((x) => x.tanggal === iso && x.slot === slot);
                return (
                  <div key={iso + slot} className="min-h-[64px] border-l border-border/60 p-2 text-xs">
                    {s ? (
                      <div className="rounded-lg bg-primary/10 p-2">
                        <div className="font-semibold text-primary">{s.user_id ? profileMap[s.user_id] ?? "…" : "Kosong"}</div>
                        {s.wilayah && <div className="text-muted-foreground">{s.wilayah}</div>}
                        {s.user_id === user?.id && (
                          <SwapButton shiftId={s.id} />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {mySwaps.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-lg font-bold">Permintaan tukar shift</h3>
          <ul className="space-y-2">
            {mySwaps.map((sw) => {
              const incoming = sw.target_user_id === user?.id && sw.status === "menunggu";
              return (
                <li key={sw.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <div>
                    <div className="font-semibold capitalize">{sw.status}</div>
                    {sw.alasan && <div className="text-xs text-muted-foreground">{sw.alasan}</div>}
                  </div>
                  {incoming && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => respondSwap.mutate({ id: sw.id, accept: true, shiftId: sw.shift_id, requestedBy: sw.requested_by })}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respondSwap.mutate({ id: sw.id, accept: false, shiftId: sw.shift_id, requestedBy: sw.requested_by })}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageShell>
  );
}

function SwapButton({ shiftId }: { shiftId: string }) {
  const { user } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [target, setTarget] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        shift_id: shiftId,
        requested_by: user!.id,
        status: "menunggu",
      };
      if (target) payload.target_user_id = target;
      if (alasan) payload.alasan = alasan;
      const { error } = await supabase.from("piket_swap_requests").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permintaan tukar dikirim");
      setOpen(false);
      setAlasan("");
      setTarget("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">
          <RefreshCw className="h-3 w-3" /> Tukar
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ajukan tukar shift</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>ID rekan tujuan (opsional)</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="kosongkan untuk terbuka" />
          </div>
          <div>
            <Label>Alasan</Label>
            <Input value={alasan} onChange={(e) => setAlasan(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewShiftDialog({ defaultDate, onDone }: { defaultDate: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(defaultDate);
  const [slot, setSlot] = useState<Shift["slot"]>("pagi");
  const [wilayah, setWilayah] = useState("");
  const [userId, setUserId] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const payload: Record<string, unknown> = { tanggal, slot };
      if (wilayah) payload.wilayah = wilayah;
      if (userId) payload.user_id = userId;
      if (u.user?.id) payload.created_by = u.user.id;
      const { error } = await supabase.from("piket_shifts").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift ditambahkan");
      setOpen(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Shift baru</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah shift piket</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label>Slot</Label>
              <Select value={slot} onValueChange={(v) => setSlot(v as Shift["slot"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {slots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Wilayah</Label>
            <Input value={wilayah} onChange={(e) => setWilayah(e.target.value)} placeholder="Malang Kota / Barat / dsb" />
          </div>
          <div>
            <Label>User ID petugas (opsional)</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid anggota" />
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            Auto-assign lanjutan akan menyusul — untuk sekarang isi user ID manual.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// unused import guard
void Badge;
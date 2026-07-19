import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIs } from "@/hooks/use-my-role";

export const Route = createFileRoute("/_authenticated/piket")({
  head: () => ({ meta: [{ title: "Jadwal Piket — DRG App" }] }),
  component: PiketPage,
});

type Slot = "pagi" | "siang" | "malam";
const SLOT_LABEL: Record<Slot, string> = { pagi: "Pagi (06–12)", siang: "Siang (12–18)", malam: "Malam (18–24)" };

type Shift = {
  id: string;
  tanggal: string;
  slot: Slot;
  wilayah: string;
  user_id: string;
  catatan: string | null;
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function PiketPage() {
  const isAdmin = useIs("admin");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );
  const start = fmtDate(days[0]);
  const end = fmtDate(days[6]);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["piket", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("piket_shifts")
        .select("*")
        .gte("tanggal", start)
        .lte("tanggal", end)
        .order("tanggal");
      if (error) throw error;
      return data as Shift[];
    },
  });

  const userIds = [...new Set(shifts.map((s) => s.user_id))];
  const { data: peopleMap = {} } = useQuery({
    queryKey: ["piket-people", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nama").in("id", userIds);
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.nama]));
    },
  });

  return (
    <PageShell
      eyebrow="PIC Satgas"
      title="Jadwal Piket Wilayah"
      description="Kalender piket per shift & wilayah. Admin/PIC dapat menugaskan Satgas."
      actions={isAdmin ? <AssignDialog defaultDate={start} onDone={() => void 0} /> : null}
    >
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => {
          const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d);
        }}>← Pekan lalu</Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          <CalendarDays className="mr-1.5 h-4 w-4" /> Hari ini
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d);
        }}>Pekan depan →</Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {start} — {end}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Shift</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="px-3 py-3 text-center">
                    <div>{d.toLocaleDateString("id-ID", { weekday: "short" })}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">{d.getDate()}/{d.getMonth() + 1}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(["pagi","siang","malam"] as Slot[]).map((slot) => (
                <tr key={slot} className="align-top">
                  <td className="px-3 py-3 font-semibold whitespace-nowrap">{SLOT_LABEL[slot]}</td>
                  {days.map((d) => {
                    const key = fmtDate(d);
                    const cell = shifts.filter((s) => s.tanggal === key && s.slot === slot);
                    return (
                      <td key={key} className="px-2 py-2">
                        <div className="min-h-[64px] space-y-1">
                          {cell.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/70 py-3 text-center text-[11px] text-muted-foreground/60">
                              kosong
                            </div>
                          ) : (
                            cell.map((s) => (
                              <ShiftPill key={s.id} shift={s} name={peopleMap[s.user_id] ?? "—"} canDelete={isAdmin} />
                            ))
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function ShiftPill({ shift, name, canDelete }: { shift: Shift; name: string; canDelete: boolean }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("piket_shifts").delete().eq("id", shift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift dihapus");
      qc.invalidateQueries({ queryKey: ["piket"] });
    },
  });
  return (
    <div className="group flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs">
      <div className="flex-1 truncate">
        <div className="font-medium text-primary">{name}</div>
        <div className="truncate text-[10px] text-muted-foreground">{shift.wilayah}</div>
      </div>
      {canDelete && (
        <button onClick={() => del.mutate()} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function AssignDialog({ defaultDate }: { defaultDate: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(defaultDate);
  const [slot, setSlot] = useState<Slot>("pagi");
  const [wilayah, setWilayah] = useState("");
  const [userId, setUserId] = useState("");
  const [catatan, setCatatan] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["piket-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id, nama").eq("status","aktif").order("nama");
      if (error) throw error;
      return data as { id: string; nama: string }[];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Tidak ada sesi");
      const { error } = await supabase.from("piket_shifts").insert({
        tanggal, slot, wilayah, user_id: userId,
        catatan: catatan || null, created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift dijadwalkan");
      qc.invalidateQueries({ queryKey: ["piket"] });
      setOpen(false); setWilayah(""); setUserId(""); setCatatan("");
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Susun Shift
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tugaskan Piket</DialogTitle>
          <DialogDescription>Pilih tanggal, shift, wilayah, dan anggota Satgas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tgl">Tanggal</Label>
              <Input id="tgl" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={slot} onValueChange={(v) => setSlot(v as Slot)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagi">Pagi (06–12)</SelectItem>
                  <SelectItem value="siang">Siang (12–18)</SelectItem>
                  <SelectItem value="malam">Malam (18–24)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="w">Wilayah</Label>
            <Input id="w" value={wilayah} onChange={(e) => setWilayah(e.target.value)} placeholder="Klojen / Blimbing / …" />
          </div>
          <div>
            <Label>Anggota</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ct">Catatan (opsional)</Label>
            <Textarea id="ct" value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!tanggal || !wilayah || !userId || mut.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
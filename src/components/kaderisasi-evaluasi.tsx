import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Jenjang = "calon" | "muda" | "madya" | "purna";
const JENJANG: Jenjang[] = ["calon", "muda", "madya", "purna"];
type Member = { id: string; nama: string; jenjang: Jenjang; status: string };

export function KaderisasiEvaluasi({ isStaff, myId }: { isStaff: boolean; myId: string | null }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"semua" | Jenjang>("semua");
  const [evalTarget, setEvalTarget] = useState<Member | null>(null);
  const [histTarget, setHistTarget] = useState<Member | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["kaderisasi-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama, jenjang, status")
        .neq("status", "pending_review")
        .order("nama");
      if (error) throw error;
      return data as Member[];
    },
  });

  const list = useMemo(
    () =>
      members.filter(
        (m) =>
          (filter === "semua" || m.jenjang === filter) &&
          m.nama.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [members, q, filter],
  );

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="font-display text-lg font-bold">Evaluasi Jenjang Anggota</h3>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama…" className="pl-8" />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              {JENJANG.map((j) => <SelectItem key={j} value={j} className="capitalize">{j}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada anggota yang cocok.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.nama}</div>
                <div className="mt-0.5 flex gap-1.5">
                  <Badge variant="secondary" className="capitalize">{m.jenjang}</Badge>
                  {m.status !== "aktif" && <Badge variant="outline" className="capitalize">{m.status}</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => setHistTarget(m)} aria-label={`Riwayat ${m.nama}`}>
                  <History className="h-4 w-4" />
                </Button>
                {isStaff && m.id !== myId && (
                  <Button size="sm" variant="outline" onClick={() => setEvalTarget(m)}>
                    <TrendingUp className="mr-1 h-4 w-4" /> Evaluasi
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <EvalDialog member={evalTarget} onClose={() => setEvalTarget(null)} />
      <HistoryDialog member={histTarget} onClose={() => setHistTarget(null)} />
    </div>
  );
}

function EvalDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [ke, setKe] = useState<Jenjang | "">("");
  const [catatan, setCatatan] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      if (!member || !ke) throw new Error("Pilih jenjang tujuan");
      if (ke === member.jenjang) throw new Error("Jenjang tujuan sama dengan jenjang sekarang");
      if (catatan.trim().length < 5) throw new Error("Tulis catatan evaluasi minimal 5 karakter");
      const { error } = await supabase.rpc("ubah_jenjang", {
        _user_id: member.id, _ke: ke, _catatan: catatan.trim().slice(0, 1000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jenjang diperbarui");
      qc.invalidateQueries({ queryKey: ["kaderisasi-members"] });
      qc.invalidateQueries({ queryKey: ["kaderisasi-stats"] });
      qc.invalidateQueries({ queryKey: ["jenjang-riwayat"] });
      setKe(""); setCatatan(""); onClose();
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evaluasi {member?.nama}</DialogTitle>
          <DialogDescription>Jenjang sekarang: <b className="capitalize">{member?.jenjang}</b>. Perubahan tercatat permanen.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Jenjang baru</Label>
            <Select value={ke} onValueChange={(v) => setKe(v as Jenjang)}>
              <SelectTrigger><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
              <SelectContent>
                {JENJANG.map((j) => <SelectItem key={j} value={j} className="capitalize">{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cat">Catatan evaluasi *</Label>
            <Textarea id="cat" rows={3} maxLength={1000} value={catatan} onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: aktif piket 3 bulan, lulus pembekalan Satgas." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["jenjang-riwayat", member?.id],
    enabled: !!member,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jenjang_riwayat")
        .select("id, dari, ke, catatan, created_at, evaluator:profiles!jenjang_riwayat_evaluator_id_fkey(nama)")
        .eq("user_id", member!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Riwayat jenjang — {member?.nama}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat (atau kamu tidak punya akses).</p>
        ) : (
          <ol className="max-h-80 space-y-3 overflow-y-auto">
            {data.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="font-medium capitalize">{r.dari ?? "—"} → {r.ke}</div>
                {r.catatan && <p className="mt-1 text-muted-foreground">{r.catatan}</p>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("id-ID")} · oleh {r.evaluator?.nama ?? "sistem"}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardList, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/screening")({
  head: () => ({ meta: [{ title: "Screening Calon — DRG App" }] }),
  component: ScreeningPage,
});

type Status = "menunggu" | "wawancara" | "direkomendasikan" | "ditolak";
type App = {
  id: string; nama: string; no_hp: string; email: string | null; alamat: string | null;
  kota: string | null; motivasi: string | null; status: Status;
  skor_total: number | null; catatan_pic: string | null; created_at: string;
};

const statusStyle: Record<Status, string> = {
  menunggu: "border-warn/50 text-warn-foreground",
  wawancara: "border-primary/40 text-primary",
  direkomendasikan: "border-success/40 text-success",
  ditolak: "border-destructive/40 text-destructive",
};

function ScreeningPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["screening-apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_applications").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as App[];
    },
  });

  const [selected, setSelected] = useState<App | null>(null);

  return (
    <PageShell
      eyebrow="PIC Kaderisasi"
      title="Screening Calon Anggota"
      description="Skor terkalkulasi dari bobot rahasia. Klik baris untuk review & putuskan."
      actions={
        <Button asChild size="sm" variant="outline">
          <a href="/daftar" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" /> Buka Formulir Publik
          </a>
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin"/></div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Belum ada calon mendaftar. Bagikan tautan /daftar.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Calon</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3">Kota</th>
                <th className="px-4 py-3">Tgl. Submit</th>
                <th className="px-4 py-3">Skor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span className="font-medium">{c.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.no_hp}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.kota ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                      {c.skor_total ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusStyle[c.status]}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReviewDialog app={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
}

function ReviewDialog({ app, onClose }: { app: App | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("menunggu");
  const [catatan, setCatatan] = useState("");

  const { data: answers = [] } = useQuery({
    queryKey: ["screening-answers", app?.id],
    enabled: !!app,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_answers")
        .select("jawaban, bobot_didapat, question_id, screening_questions(pertanyaan, bobot_max)")
        .eq("application_id", app!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (app) { setStatus(app.status); setCatatan(app.catatan_pic ?? ""); }
  }, [app]);

  const save = useMutation({
    mutationFn: async () => {
      if (!app) return;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("screening_applications").update({
        status, catatan_pic: catatan || null,
        reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString(),
      }).eq("id", app.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Keputusan disimpan");
      qc.invalidateQueries({ queryKey: ["screening-apps"] });
      onClose();
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review — {app?.nama}</DialogTitle>
          <DialogDescription>Skor total: <strong>{app?.skor_total ?? 0}</strong></DialogDescription>
        </DialogHeader>
        {app && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
              <div><div className="text-xs text-muted-foreground">HP</div><div className="font-mono">{app.no_hp}</div></div>
              <div><div className="text-xs text-muted-foreground">Email</div><div>{app.email ?? "—"}</div></div>
              <div className="col-span-2"><div className="text-xs text-muted-foreground">Alamat</div><div>{app.alamat ?? "—"}, {app.kota ?? ""}</div></div>
              <div className="col-span-2"><div className="text-xs text-muted-foreground">Motivasi</div><div>{app.motivasi ?? "—"}</div></div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Jawaban screening</div>
              <div className="space-y-2">
                {answers.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border p-2 text-sm">
                    <div className="text-xs text-muted-foreground">{a.screening_questions?.pertanyaan}</div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span>{a.jawaban}</span>
                      <span className="font-mono text-xs text-primary">
                        {a.bobot_didapat}/{a.screening_questions?.bobot_max ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menunggu">Menunggu</SelectItem>
                    <SelectItem value="wawancara">Perlu Wawancara</SelectItem>
                    <SelectItem value="direkomendasikan">Direkomendasikan</SelectItem>
                    <SelectItem value="ditolak">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catatan PIC</Label>
                <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90">
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan Keputusan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
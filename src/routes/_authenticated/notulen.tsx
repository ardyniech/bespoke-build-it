import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/notulen")({
  head: () => ({
    meta: [
      { title: "Notulen Rapat — DRG App" },
      {
        name: "description",
        content: "Arsip notulen rapat pengurus, Satgas, dan kaderisasi komunitas DRG.",
      },
      { property: "og:title", content: "Notulen Rapat — DRG App" },
      {
        property: "og:description",
        content: "Arsip notulen rapat pengurus, Satgas, dan kaderisasi komunitas DRG.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotulenPage,
});

type Notulen = {
  id: string;
  tanggal: string;
  jenis_rapat: string;
  pemimpin_rapat: string;
  notulis: string;
  poin_poin: string[];
  catatan_tambahan: string | null;
  created_by: string;
};

type FormState = {
  tanggal: string;
  jenis_rapat: string;
  pemimpin_rapat: string;
  notulis: string;
  poin: string[];
  catatan_tambahan: string;
};

const emptyForm = (): FormState => ({
  tanggal: new Date().toISOString().slice(0, 10),
  jenis_rapat: "",
  pemimpin_rapat: "",
  notulis: "",
  poin: [""],
  catatan_tambahan: "",
});

function formatTanggal(v: string) {
  return new Date(`${v}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function NotulenPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = !!me?.roles.some((r) => r === "admin" || r === "super_admin");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notulen | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [detail, setDetail] = useState<Notulen | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["notulen"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notulen")
        .select("id, tanggal, jenis_rapat, pemimpin_rapat, notulis, poin_poin, catatan_tambahan, created_by")
        .order("tanggal", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((n) => ({
        ...n,
        poin_poin: Array.isArray(n.poin_poin) ? (n.poin_poin as string[]) : [],
      })) as Notulen[];
    },
  });

  const canManage = (n: Notulen) => isAdmin || n.created_by === me?.id;

  const save = useMutation({
    mutationFn: async () => {
      if (!me?.id) throw new Error("Sesi tidak ditemukan");
      const poin = form.poin.map((p) => p.trim()).filter(Boolean);
      if (!form.jenis_rapat.trim() || !form.pemimpin_rapat.trim() || !form.notulis.trim()) {
        throw new Error("Jenis rapat, pemimpin, dan notulis wajib diisi");
      }
      if (poin.length === 0) throw new Error("Minimal satu poin rapat");
      const payload = {
        tanggal: form.tanggal,
        jenis_rapat: form.jenis_rapat.trim(),
        pemimpin_rapat: form.pemimpin_rapat.trim(),
        notulis: form.notulis.trim(),
        poin_poin: poin,
        catatan_tambahan: form.catatan_tambahan.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("notulen").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notulen").insert({ ...payload, created_by: me.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Notulen diperbarui" : "Notulen tersimpan");
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ["notulen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notulen").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notulen dihapus");
      setDetail(null);
      qc.invalidateQueries({ queryKey: ["notulen"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (n: Notulen) => {
    setEditing(n);
    setForm({
      tanggal: n.tanggal,
      jenis_rapat: n.jenis_rapat,
      pemimpin_rapat: n.pemimpin_rapat,
      notulis: n.notulis,
      poin: n.poin_poin.length ? n.poin_poin : [""],
      catatan_tambahan: n.catatan_tambahan ?? "",
    });
    setDetail(null);
    setFormOpen(true);
  };

  return (
    <PageShell
      eyebrow="Sekretariat"
      title="Notulen Rapat"
      description="Arsip rapat pengurus, Satgas, dan kaderisasi — versi ringkas dari SOP Rapat."
      actions={
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Notulen Baru
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat notulen…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada notulen. Klik “Notulen Baru” untuk mencatat rapat pertama.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((n) => (
            <article
              key={n.id}
              onClick={() => setDetail(n)}
              className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{formatTanggal(n.tanggal)}</span>
                  <Badge variant="outline" className="text-[10px]">{n.poin_poin.length} poin</Badge>
                </div>
                <h3 className="font-display text-base font-bold">{n.jenis_rapat}</h3>
                <div className="mt-1 text-xs text-muted-foreground">
                  Dipimpin <span className="font-semibold text-foreground">{n.pemimpin_rapat}</span> · Notulis{" "}
                  {n.notulis}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{detail.jenis_rapat}</DialogTitle>
                <DialogDescription>
                  {formatTanggal(detail.tanggal)} · Dipimpin {detail.pemimpin_rapat} · Notulis {detail.notulis}
                </DialogDescription>
              </DialogHeader>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {detail.poin_poin.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
              {detail.catatan_tambahan && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Catatan tambahan</p>
                  {detail.catatan_tambahan}
                </div>
              )}
              {canManage(detail) && (
                <DialogFooter className="gap-2 sm:justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(detail.id)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Hapus
                  </Button>
                  <Button size="sm" onClick={() => openEdit(detail)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit Notulen" : "Notulen Baru"}</DialogTitle>
            <DialogDescription>Catat hasil rapat beserta poin-poin keputusannya.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input
                id="tanggal"
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="jenis">Jenis rapat</Label>
              <Input
                id="jenis"
                placeholder="Rapat Pengurus Bulanan"
                value={form.jenis_rapat}
                onChange={(e) => setForm({ ...form, jenis_rapat: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pemimpin">Pemimpin rapat</Label>
                <Input
                  id="pemimpin"
                  value={form.pemimpin_rapat}
                  onChange={(e) => setForm({ ...form, pemimpin_rapat: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="notulis">Notulis</Label>
                <Input
                  id="notulis"
                  value={form.notulis}
                  onChange={(e) => setForm({ ...form, notulis: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Poin-poin rapat</Label>
              {form.poin.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Poin ${i + 1}`}
                    value={p}
                    onChange={(e) => {
                      const poin = [...form.poin];
                      poin[i] = e.target.value;
                      setForm({ ...form, poin });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={form.poin.length === 1}
                    onClick={() => setForm({ ...form, poin: form.poin.filter((_, x) => x !== i) })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setForm({ ...form, poin: [...form.poin, ""] })}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Tambah poin
              </Button>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="catatan">Catatan tambahan (opsional)</Label>
              <Textarea
                id="catatan"
                rows={3}
                value={form.catatan_tambahan}
                onChange={(e) => setForm({ ...form, catatan_tambahan: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {save.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
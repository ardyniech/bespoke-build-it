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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, History, ArrowLeftRight, Pencil, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/inventaris")({
  head: () => ({
    meta: [
      { title: "Inventaris Komunitas — DRG App" },
      {
        name: "description",
        content: "Katalog barang logistik komunitas DRG beserta stok, kondisi, dan riwayat mutasi.",
      },
      { property: "og:title", content: "Inventaris Komunitas — DRG App" },
      {
        property: "og:description",
        content: "Katalog barang logistik komunitas DRG beserta stok, kondisi, dan riwayat mutasi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventarisPage,
});

type Barang = {
  id: string;
  nama: string;
  jumlah: number;
  kondisi: string;
  lokasi_simpan: string;
  catatan: string | null;
};

const KONDISI = ["Baik", "Rusak Sebagian", "Rusak", "Perlu isi ulang"];

function kondisiClass(k: string) {
  if (k === "Baik") return "border-success/40 text-success";
  if (k.startsWith("Rusak")) return "border-destructive/40 text-destructive";
  return "border-warn/50 text-warn-foreground";
}

function InventarisPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = !!me?.roles.some((r) => r === "admin" || r === "super_admin");

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    jumlah: "0",
    kondisi: "Baik",
    lokasi_simpan: "",
    catatan: "",
  });

  const [editing, setEditing] = useState<Barang | null>(null);
  const [editForm, setEditForm] = useState({ kondisi: "Baik", lokasi_simpan: "" });

  const [mutasiFor, setMutasiFor] = useState<Barang | null>(null);
  const [mutasiForm, setMutasiForm] = useState({ jenis: "masuk", jumlah: "1", keterangan: "" });

  const [riwayatFor, setRiwayatFor] = useState<Barang | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["inventaris"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventaris_barang")
        .select("id, nama, jumlah, kondisi, lokasi_simpan, catatan")
        .order("nama");
      if (error) throw error;
      return (data ?? []) as Barang[];
    },
  });

  const { data: riwayat = [], isLoading: loadingRiwayat } = useQuery({
    queryKey: ["inventaris-mutasi", riwayatFor?.id],
    enabled: !!riwayatFor,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventaris_mutasi")
        .select("id, jenis, jumlah_perubahan, keterangan, created_at, actor_id")
        .eq("barang_id", riwayatFor!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nama").in("id", ids);
        names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nama]));
      }
      return rows.map((r) => ({ ...r, actor_nama: r.actor_id ? (names[r.actor_id] ?? "—") : "—" }));
    },
  });

  const tambah = useMutation({
    mutationFn: async () => {
      const jumlah = Number(form.jumlah);
      if (!form.nama.trim()) throw new Error("Nama barang wajib diisi");
      if (!form.lokasi_simpan.trim()) throw new Error("Lokasi simpan wajib diisi");
      if (!Number.isInteger(jumlah) || jumlah < 0) throw new Error("Jumlah harus bilangan bulat ≥ 0");
      const { error } = await supabase.from("inventaris_barang").insert({
        nama: form.nama.trim(),
        jumlah,
        kondisi: form.kondisi,
        lokasi_simpan: form.lokasi_simpan.trim(),
        catatan: form.catatan.trim() || null,
        created_by: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Barang ditambahkan");
      setAddOpen(false);
      setForm({ nama: "", jumlah: "0", kondisi: "Baik", lokasi_simpan: "", catatan: "" });
      qc.invalidateQueries({ queryKey: ["inventaris"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const simpanEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      if (!editForm.lokasi_simpan.trim()) throw new Error("Lokasi simpan wajib diisi");
      const { error } = await supabase
        .from("inventaris_barang")
        .update({ kondisi: editForm.kondisi, lokasi_simpan: editForm.lokasi_simpan.trim() })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Barang diperbarui");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["inventaris"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hapus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventaris_barang").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Barang dihapus");
      qc.invalidateQueries({ queryKey: ["inventaris"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const catatMutasi = useMutation({
    mutationFn: async () => {
      if (!mutasiFor) return;
      const jumlah = Number(mutasiForm.jumlah);
      if (!Number.isInteger(jumlah) || jumlah === 0) throw new Error("Jumlah perubahan tidak valid");
      const { error } = await supabase.from("inventaris_mutasi").insert({
        barang_id: mutasiFor.id,
        jenis: mutasiForm.jenis,
        jumlah_perubahan: jumlah,
        keterangan: mutasiForm.keterangan.trim() || null,
        actor_id: me?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mutasi tercatat");
      setMutasiFor(null);
      setMutasiForm({ jenis: "masuk", jumlah: "1", keterangan: "" });
      qc.invalidateQueries({ queryKey: ["inventaris"] });
      qc.invalidateQueries({ queryKey: ["inventaris-mutasi"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageShell
      eyebrow="Logistik"
      title="Inventaris Komunitas"
      description="Katalog barang komunitas mengacu F-LOG-01."
      actions={
        isAdmin ? (
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Barang
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat inventaris…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada barang tercatat{isAdmin ? " — klik “Tambah Barang” untuk memulai." : "."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Barang</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3">Kondisi</th>
                <th className="px-4 py-3">Lokasi Simpan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((it) => (
                <tr key={it.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    {it.nama}
                    {it.catatan && (
                      <span className="block text-xs font-normal text-muted-foreground">{it.catatan}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{it.jumlah}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={kondisiClass(it.kondisi)}>
                      {it.kondisi}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{it.lokasi_simpan}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setRiwayatFor(it)}>
                        <History className="mr-1.5 h-4 w-4" /> Riwayat
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setMutasiFor(it)}>
                            <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Mutasi
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit barang"
                            onClick={() => {
                              setEditing(it);
                              setEditForm({ kondisi: it.kondisi, lokasi_simpan: it.lokasi_simpan });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Hapus barang"
                            className="text-destructive"
                            disabled={hapus.isPending}
                            onClick={() => hapus.mutate(it.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tambah barang */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Barang</DialogTitle>
            <DialogDescription>Catat barang baru beserta stok awalnya.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nama">Nama barang</Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="jumlah">Jumlah awal</Label>
                <Input
                  id="jumlah"
                  type="number"
                  min={0}
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Kondisi</Label>
                <Select value={form.kondisi} onValueChange={(v) => setForm({ ...form, kondisi: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KONDISI.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lokasi">Lokasi simpan</Label>
              <Input
                id="lokasi"
                placeholder="Posko Klojen"
                value={form.lokasi_simpan}
                onChange={(e) => setForm({ ...form, lokasi_simpan: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="catatan">Catatan (opsional)</Label>
              <Textarea
                id="catatan"
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => tambah.mutate()}
              disabled={tambah.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {tambah.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit barang */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit {editing?.nama}</DialogTitle>
            <DialogDescription>Ubah kondisi dan lokasi penyimpanan barang.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Kondisi</Label>
              <Select
                value={editForm.kondisi}
                onValueChange={(v) => setEditForm({ ...editForm, kondisi: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KONDISI.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-lokasi">Lokasi simpan</Label>
              <Input
                id="edit-lokasi"
                value={editForm.lokasi_simpan}
                onChange={(e) => setEditForm({ ...editForm, lokasi_simpan: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={() => simpanEdit.mutate()} disabled={simpanEdit.isPending}>
              {simpanEdit.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catat mutasi */}
      <Dialog open={!!mutasiFor} onOpenChange={(o) => !o && setMutasiFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Catat Mutasi</DialogTitle>
            <DialogDescription>
              {mutasiFor?.nama} · stok saat ini {mutasiFor?.jumlah}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Jenis</Label>
                <Select
                  value={mutasiForm.jenis}
                  onValueChange={(v) => setMutasiForm({ ...mutasiForm, jenis: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masuk">Masuk</SelectItem>
                    <SelectItem value="keluar">Keluar</SelectItem>
                    <SelectItem value="penyesuaian">Penyesuaian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mjumlah">Jumlah</Label>
                <Input
                  id="mjumlah"
                  type="number"
                  value={mutasiForm.jumlah}
                  onChange={(e) => setMutasiForm({ ...mutasiForm, jumlah: e.target.value })}
                />
              </div>
            </div>
            {mutasiForm.jenis === "penyesuaian" && (
              <p className="text-xs text-muted-foreground">
                Penyesuaian memakai nilai apa adanya — gunakan angka negatif untuk mengurangi stok.
              </p>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="ket">Keterangan</Label>
              <Textarea
                id="ket"
                rows={2}
                value={mutasiForm.keterangan}
                onChange={(e) => setMutasiForm({ ...mutasiForm, keterangan: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMutasiFor(null)}>
              Batal
            </Button>
            <Button
              onClick={() => catatMutasi.mutate()}
              disabled={catatMutasi.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {catatMutasi.isPending ? "Menyimpan…" : "Catat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Riwayat mutasi */}
      <Dialog open={!!riwayatFor} onOpenChange={(o) => !o && setRiwayatFor(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Riwayat Mutasi</DialogTitle>
            <DialogDescription>{riwayatFor?.nama}</DialogDescription>
          </DialogHeader>
          {loadingRiwayat ? (
            <p className="text-sm text-muted-foreground">Memuat riwayat…</p>
          ) : riwayat.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada mutasi untuk barang ini.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {riwayat.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          m.jumlah_perubahan >= 0
                            ? "border-success/40 text-success"
                            : "border-destructive/40 text-destructive"
                        }
                      >
                        {m.jenis}
                      </Badge>
                      <span className="font-mono text-xs">
                        {m.jumlah_perubahan > 0 ? `+${m.jumlah_perubahan}` : m.jumlah_perubahan}
                      </span>
                    </div>
                    {m.keterangan && <p className="mt-1 text-muted-foreground">{m.keterangan}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>{new Date(m.created_at).toLocaleString("id-ID")}</div>
                    <div>{m.actor_nama}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

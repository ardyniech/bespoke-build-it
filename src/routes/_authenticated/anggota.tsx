import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/anggota")({
  head: () => ({ meta: [{ title: "Data Anggota — DRG App" }] }),
  component: AnggotaPage,
});

const jenjangTone: Record<string, string> = {
  madya: "bg-primary/10 text-primary",
  muda: "bg-accent/25 text-accent-foreground",
  purna: "bg-muted text-muted-foreground",
  calon: "bg-muted text-muted-foreground",
};

function AnggotaPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["anggota"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama, no_hp, alamat, jenjang, status")
        .order("nama");
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((a) =>
    !q ||
    a.nama.toLowerCase().includes(q.toLowerCase()) ||
    (a.no_hp ?? "").includes(q) ||
    (a.alamat ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <PageShell
      eyebrow="Sekretariat"
      title="Data Anggota"
      description={`Direktori terpusat — ${data?.length ?? 0} anggota terdaftar (F-SEK-03).`}
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <UserPlus className="mr-1.5 h-4 w-4" /> Tambah Anggota
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, No. HP, atau wilayah…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-1.5 h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Belum ada anggota. Ajak rekan-rekan mendaftar!
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">No. HP</th>
                <th className="px-4 py-3">Wilayah</th>
                <th className="px-4 py-3">Jenjang</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.id} className="transition hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-xs font-bold text-primary-foreground">
                        {(a.nama || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="font-medium">{a.nama || "Tanpa nama"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.no_hp ?? "—"}</td>
                  <td className="px-4 py-3">{a.alamat ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${jenjangTone[a.jenjang] ?? "bg-muted text-muted-foreground"}`}>
                      {a.jenjang}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={
                        a.status === "aktif"
                          ? "border-success/40 capitalize text-success"
                          : "border-muted-foreground/40 capitalize text-muted-foreground"
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}

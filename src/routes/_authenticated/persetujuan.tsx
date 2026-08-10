import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated/persetujuan")({
  head: () => ({
    meta: [
      { title: "Persetujuan Akun — DRG App" },
      {
        name: "description",
        content: "Tinjau dan setujui akun anggota baru DRG sebelum mereka bisa mengakses data komunitas.",
      },
      { property: "og:title", content: "Persetujuan Akun — DRG App" },
      {
        property: "og:description",
        content: "Admin meninjau akun berstatus menunggu sebelum diberi akses penuh.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PersetujuanPage,
});

type Pending = {
  id: string;
  nama: string;
  status: string;
  jenjang: string;
  created_at: string;
};

function PersetujuanPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = !!me?.roles.some((r) => r === "admin" || r === "super_admin");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pending-accounts"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nama, status, jenjang, created_at")
        .eq("status", "pending_review")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Pending[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aktif" | "nonaktif" }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "aktif" ? "Akun disetujui" : "Akun ditolak");
      qc.invalidateQueries({ queryKey: ["pending-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <PageShell eyebrow="Terbatas" title="Persetujuan Akun" description="Halaman ini khusus admin.">
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Kamu tidak punya akses ke modul ini.
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Admin"
      title="Persetujuan Akun"
      description="Akun baru dari halaman masuk berstatus menunggu review. Setujui agar mereka bisa mengakses peta live, direktori anggota, kas, dan kejadian."
    >
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-success" />
          Tidak ada akun yang menunggu persetujuan.
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="min-w-0">
                <div className="font-semibold">{r.nama}</div>
                <div className="text-xs text-muted-foreground">
                  Mendaftar{" "}
                  {new Date(r.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-warn text-warn-foreground">menunggu review</Badge>
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: r.id, status: "aktif" })}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Setujui
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: r.id, status: "nonaktif" })}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" /> Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
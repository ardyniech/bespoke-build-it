import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/kaderisasi")({
  head: () => ({ meta: [{ title: "Kaderisasi — DRG App" }] }),
  component: KaderisasiPage,
});

function KaderisasiPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["kaderisasi-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("jenjang");
      if (error) throw error;
      const bucket = { calon: 0, muda: 0, madya: 0, purna: 0 };
      for (const r of data ?? []) bucket[r.jenjang as keyof typeof bucket]++;
      return bucket;
    },
  });

  const { data: pending = 0 } = useQuery({
    queryKey: ["screening-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("screening_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "menunggu");
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <PageShell
      eyebrow="PIC Kaderisasi"
      title="Evaluasi & Jenjang"
      description="Bagikan formulir pendaftaran calon, kelola screening, dan pantau distribusi jenjang."
      actions={
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/daftar" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Buka Formulir Publik
            </a>
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/screening">
              Screening {pending > 0 ? `(${pending} baru)` : ""}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["calon","muda","madya","purna"] as const).map((k) => (
          <div key={k} className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
            {statsLoading ? (
              <div className="mx-auto h-8 w-10 animate-pulse rounded bg-muted" />
            ) : (
              <div className="font-display text-3xl font-bold">{stats?.[k] ?? 0}</div>
            )}
            <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{k}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/25 text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold">Alur Kaderisasi</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Calon isi formulir publik <code className="rounded bg-muted px-1">/daftar</code>.</li>
              <li>PIC Kaderisasi review skor & wawancara di halaman Screening.</li>
              <li>Naikkan status jenjang lewat halaman Anggota (calon → muda → madya → purna).</li>
            </ol>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
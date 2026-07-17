import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/etik")({
  head: () => ({
    meta: [
      { title: "Dewan Etik — DRG App" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EtikPage,
});

function EtikPage() {
  return (
    <PageShell
      eyebrow="Dewan Etik"
      title="Laporan Pelanggaran"
      description="Modul terbatas. Isi laporan bersifat rahasia dan hanya dapat diakses anggota Dewan Etik yang terverifikasi."
    >
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-bold">Modul akses terbatas</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Data laporan disimpan terenkripsi. Untuk melihat isi laporan, verifikasi
          identitas Anda sebagai anggota Dewan Etik terlebih dulu.
        </p>
        <Button className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Lock className="mr-1.5 h-4 w-4" /> Verifikasi &amp; Buka
        </Button>
      </div>
    </PageShell>
  );
}
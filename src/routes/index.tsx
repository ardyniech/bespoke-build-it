import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Siren, Users, Wallet, Map, ArrowRight, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DRG App — Platform Komunitas Driver Riang Gembira" },
      {
        name: "description",
        content:
          "Satu aplikasi untuk operasional komunitas driver: data anggota, kas transparan, SOS darurat, dan piket Satgas.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, title: "Data Anggota", desc: "Direktori terpusat, akses berbasis peran." },
  { icon: Wallet, title: "Kas Transparan", desc: "Dua ledger (Sosial & Koperasi) real-time." },
  { icon: Siren, title: "SOS Cepat", desc: "Tekan tombol darurat, Satgas terdekat merespons." },
  { icon: Map, title: "Peta Wilayah", desc: "Pantau piket & titik rawan tanpa Google Maps." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">D</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold">DRG App</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Riang Gembira
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Masuk</Link>
          </Button>
          <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/auth" search={{ mode: "signup" }}>
              Daftar <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-warm p-8 shadow-warm md:p-14">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Untuk komunitas driver
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
                Satu aplikasi untuk semua urusan komunitas.
              </h1>
              <p className="mt-5 max-w-xl text-base text-primary-foreground/85 md:text-lg">
                Kas transparan, anggota terdata, dan SOS respons cepat — supaya
                jalanan lebih riang, gembira, dan aman.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link to="/auth" search={{ mode: "signup" }}>Mulai gratis</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/auth">Sudah punya akun</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 md:flex-row md:px-8">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Komunitas DRG. Dibuat dengan hati untuk jalanan.
          </span>
          <Link to="/auth" className="text-xs font-medium text-primary hover:underline">
            Masuk anggota →
          </Link>
        </div>
      </footer>
    </div>
  );
}

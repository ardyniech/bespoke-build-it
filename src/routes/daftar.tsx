import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/daftar")({
  head: () => ({
    meta: [
      { title: "Daftar Calon Anggota — DRG" },
      { name: "description", content: "Formulir pendaftaran calon anggota Komunitas Driver Riang Gembira (DRG)." },
    ],
  }),
  component: DaftarPage,
});

type Q = { id: string; urutan: number; pertanyaan: string; tipe: string; opsi: { label: string }[] | null };

function DaftarPage() {
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["screening-q-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening_questions_public")
        .select("*")
        .order("urutan");
      if (error) throw error;
      return data as Q[];
    },
  });

  const [form, setForm] = useState({ nama: "", no_hp: "", email: "", alamat: "", kota: "", motivasi: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(
    () => form.nama.trim().length > 2 && form.no_hp.trim().length > 6,
    [form],
  );

  const submit = useMutation({
    mutationFn: async () => {
      const { data: app, error } = await supabase.from("screening_applications").insert({
        nama: form.nama.trim(),
        no_hp: form.no_hp.trim(),
        email: form.email.trim() || null,
        alamat: form.alamat.trim() || null,
        kota: form.kota.trim() || null,
        motivasi: form.motivasi.trim() || null,
      }).select("id").single();
      if (error) throw error;

      const rows = questions
        .filter((q) => answers[q.id])
        .map((q) => ({ application_id: app.id, question_id: q.id, jawaban: answers[q.id] }));
      if (rows.length) {
        const { error: e2 } = await supabase.from("screening_answers").insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error("Gagal mengirim", { description: e.message }),
  });

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Terima kasih!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Formulir kamu sudah masuk. PIC Kaderisasi DRG akan menghubungi via WhatsApp untuk tahap berikutnya.
        </p>
        <Button asChild variant="outline" className="mt-6"><Link to="/">Kembali ke Beranda</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Pendaftaran Publik
        </div>
        <h1 className="font-display text-3xl font-bold">Daftar Jadi Anggota DRG</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Isi data diri dan jawaban singkat. Skor kelayakan dinilai internal — kamu tidak melihat bobotnya.
        </p>
      </header>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        <section className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="nama">Nama lengkap *</Label>
            <Input id="nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="hp">No. WhatsApp *</Label>
            <Input id="hp" value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} placeholder="0812…" required />
          </div>
          <div>
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="al">Alamat</Label>
            <Input id="al" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="kt">Kota</Label>
            <Input id="kt" value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="mv">Motivasi bergabung</Label>
            <Textarea id="mv" rows={3} value={form.motivasi} onChange={(e) => setForm({ ...form, motivasi: e.target.value })} />
          </div>
        </section>

        {isLoading ? null : questions.length > 0 && (
          <section className="space-y-4 border-t border-border pt-5">
            <h2 className="font-display text-lg font-semibold">Pertanyaan Screening</h2>
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>{q.urutan}. {q.pertanyaan}</Label>
                {q.opsi && q.opsi.length ? (
                  <div className="flex flex-wrap gap-2">
                    {q.opsi.map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: o.label })}
                        className={
                          "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                          (answers[q.id] === o.label
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50")
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Textarea rows={2} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
              </div>
            ))}
          </section>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Dengan mengirim, kamu setuju data dihubungi oleh pengurus DRG.</p>
          <Button
            onClick={() => submit.mutate()}
            disabled={!canSubmit || submit.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim Pendaftaran
          </Button>
        </div>
      </div>
    </div>
  );
}
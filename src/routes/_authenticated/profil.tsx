import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/hooks/use-my-role";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, User as UserIcon, KeyRound, BellRing, Bell } from "lucide-react";
import { usePush } from "@/hooks/use-push";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

type ProfileRow = {
  id: string;
  nama: string;
  no_hp: string | null;
  alamat: string | null;
  bio: string | null;
  email: string | null;
  foto_url: string | null;
  jenjang: "calon" | "muda" | "madya" | "purna";
  status: "aktif" | "nonaktif" | "cuti";
  notif_sos: boolean;
  notif_kas: boolean;
  notif_pengumuman: boolean;
  notif_email: boolean;
};

function ProfilPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthEmail(data.user?.email ?? null);
    });
  }, []);

  const { data: profile, isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  const { data: roles = [] } = useMyRoles();

  const [form, setForm] = useState<Partial<ProfileRow>>({});
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const saveBio = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Tidak ada sesi");
      const { error } = await supabase
        .from("profiles")
        .update({
          nama: form.nama ?? "",
          no_hp: form.no_hp ?? null,
          alamat: form.alamat ?? null,
          bio: form.bio ?? null,
          email: form.email ?? null,
          jenjang: (form.jenjang ?? "calon") as ProfileRow["jenjang"],
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Biodata tersimpan");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["anggota"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNotif = useMutation({
    mutationFn: async (patch: Partial<ProfileRow>) => {
      if (!userId) throw new Error("Tidak ada sesi");
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword() {
    if (pw1.length < 8) return toast.error("Password minimal 8 karakter");
    if (pw1 !== pw2) return toast.error("Konfirmasi password tidak cocok");
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setPwLoading(false);
    if (error) return toast.error(error.message);
    setPw1("");
    setPw2("");
    toast.success("Password diperbarui");
  }

  async function handleAvatarUpload(file: File) {
    if (!userId) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl ?? null;
    const { error } = await supabase
      .from("profiles")
      .update({ foto_url: url })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Foto profil diperbarui");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  const initials = (form.nama ?? authEmail ?? "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <PageShell
      eyebrow="Akun Saya"
      title="Profil Pengguna"
      description="Kelola biodata, foto profil, kata sandi, dan preferensi notifikasi kamu."
    >
      {isLoading || !profile ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Ringkasan akun */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" /> Ringkasan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                {form.foto_url ? (
                  <img
                    src={form.foto_url}
                    alt={form.nama ?? ""}
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-primary/30"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-primary/15 font-display text-2xl font-bold text-primary">
                    {initials || "?"}
                  </div>
                )}
              </div>
              <div>
                <div className="font-display text-lg font-semibold">
                  {form.nama || "Anggota DRG"}
                </div>
                <div className="text-xs text-muted-foreground">{authEmail}</div>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                <Badge variant="secondary" className="capitalize">
                  {profile.jenjang}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {profile.status}
                </Badge>
                {roles.map((r) => (
                  <Badge key={r} className="bg-primary/15 text-primary hover:bg-primary/20">
                    {r}
                  </Badge>
                ))}
              </div>
              <Separator />
              <div className="w-full">
                <Label
                  htmlFor="avatar"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Upload className="h-4 w-4" /> Unggah foto
                </Label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Biodata */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Biodata</CardTitle>
              <CardDescription>
                Data ini terlihat oleh sesama anggota di direktori.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nama">Nama lengkap</Label>
                  <Input
                    id="nama"
                    value={form.nama ?? ""}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="no_hp">Nomor HP</Label>
                  <Input
                    id="no_hp"
                    inputMode="tel"
                    value={form.no_hp ?? ""}
                    onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email_kontak">Email kontak</Label>
                  <Input
                    id="email_kontak"
                    type="email"
                    placeholder={authEmail ?? ""}
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jenjang">Jenjang</Label>
                  <Select
                    value={form.jenjang ?? "calon"}
                    onValueChange={(v) =>
                      setForm({ ...form, jenjang: v as ProfileRow["jenjang"] })
                    }
                  >
                    <SelectTrigger id="jenjang">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calon">Calon</SelectItem>
                      <SelectItem value="muda">Muda</SelectItem>
                      <SelectItem value="madya">Madya</SelectItem>
                      <SelectItem value="purna">Purna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={form.alamat ?? ""}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio singkat</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  placeholder="Ceritakan sedikit tentang kamu…"
                  value={form.bio ?? ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveBio.mutate()}
                  disabled={saveBio.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saveBio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan biodata
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifikasi */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-4 w-4" /> Preferensi Notifikasi
              </CardTitle>
              <CardDescription>
                Atur peristiwa apa saja yang kamu terima di aplikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              {[
                {
                  key: "notif_sos" as const,
                  label: "SOS & Kejadian Darurat",
                  desc: "Broadcast panggilan darurat dari anggota lain.",
                },
                {
                  key: "notif_kas" as const,
                  label: "Aktivitas Kas",
                  desc: "Transaksi masuk/keluar & pengingat iuran.",
                },
                {
                  key: "notif_pengumuman" as const,
                  label: "Pengumuman & Notulen",
                  desc: "Rapat, jadwal piket, dan pengumuman pengurus.",
                },
                {
                  key: "notif_email" as const,
                  label: "Ringkasan Email Mingguan",
                  desc: "Rangkuman aktivitas komunitas dikirim ke email.",
                },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between py-3">
                  <div className="pr-4">
                    <div className="text-sm font-medium">{row.label}</div>
                    <div className="text-xs text-muted-foreground">{row.desc}</div>
                  </div>
                  <Switch
                    checked={Boolean(form[row.key])}
                    onCheckedChange={(v) => {
                      setForm({ ...form, [row.key]: v });
                      saveNotif.mutate({ [row.key]: v });
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" /> Ubah Kata Sandi
              </CardTitle>
              <CardDescription>Minimal 8 karakter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw1">Password baru</Label>
                <Input
                  id="pw1"
                  type="password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Konfirmasi</Label>
                <Input
                  id="pw2"
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Perbarui password
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
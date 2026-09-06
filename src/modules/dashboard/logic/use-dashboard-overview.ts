import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, toIsoDate, logModuleError } from "@/shared/utils/formatters";
import type { DashboardOverview, ShiftSummary, ActivityFeedItem } from "@/shared/models/dashboard";

export function useDashboardOverview() {
  const today = toIsoDate(new Date());
  const monthStart = toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return useQuery({
    queryKey: ["dashboard-overview", today],
    staleTime: 30_000,
    queryFn: async (): Promise<DashboardOverview> => {
      try {
        const [anggota, kas, kejadian, piket] = await Promise.all([
          supabase.from("profiles").select("id, status"),
          supabase.from("kas_transactions").select("jenis, jumlah, kategori, deskripsi, tanggal, status, created_at"),
          supabase.from("kejadian").select("id, tipe, status, deskripsi, alamat_text, dibuat_at").order("dibuat_at", { ascending: false }).limit(20),
          supabase.from("piket_shifts").select("id, tanggal, slot, wilayah, user_id").eq("tanggal", today),
        ]);

        const profiles = anggota.data ?? [];
        const trx = (kas.data ?? []).filter((t) => t.status === "disetujui");
        const saldo = trx.reduce((acc, t) => acc + (t.jenis === "masuk" ? Number(t.jumlah) : -Number(t.jumlah)), 0);
        const masukBulanIni = trx
          .filter((t) => t.tanggal >= monthStart)
          .reduce((acc, t) => acc + (t.jenis === "masuk" ? Number(t.jumlah) : 0), 0);
        const menunggu = (kas.data ?? []).filter((t) => t.status === "menunggu").length;

        const insiden = kejadian.data ?? [];
        const insidenBulanIni = insiden.filter((k) => k.dibuat_at >= monthStart);
        const insidenAktif = insiden.filter((k) => k.status !== "closed");

        const shifts = piket.data ?? [];
        const perWilayah = new Map<string, ShiftSummary>();
        for (const s of shifts) {
          const key = `${s.wilayah}|${s.slot}`;
          const prev = perWilayah.get(key);
          perWilayah.set(key, { wilayah: s.wilayah, slot: s.slot, personil: (prev?.personil ?? 0) + 1 });
        }

        const feed: ActivityFeedItem[] = [
          ...insiden.slice(0, 5).map((k) => ({
            at: k.dibuat_at,
            tag: "SOS" as const,
            tone: "signal" as const,
            text: `${k.tipe.toUpperCase()} — ${k.alamat_text || k.deskripsi || "tanpa keterangan"} · ${k.status}`,
          })),
          ...trx
            .slice()
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 5)
            .map((t) => ({
              at: t.created_at,
              tag: "Kas" as const,
              tone: (t.jenis === "masuk" ? "success" : "muted") as "success" | "muted",
              text: `${t.jenis === "masuk" ? "Pemasukan" : "Pengeluaran"} ${t.kategori}: ${formatRupiah(Number(t.jumlah))}`,
            })),
        ]
          .sort((a, b) => (a.at < b.at ? 1 : -1))
          .slice(0, 8);

        return {
          anggotaAktif: profiles.filter((p) => p.status === "aktif").length,
          anggotaTotal: profiles.length,
          saldo,
          masukBulanIni,
          menunggu,
          insidenBulanIni: insidenBulanIni.length,
          insidenAktif: insidenAktif.length,
          shiftHariIni: shifts.length,
          wilayahHariIni: new Set(shifts.map((s) => s.wilayah)).size,
          piket: [...perWilayah.values()].sort((a, b) => a.wilayah.localeCompare(b.wilayah)),
          feed,
        };
      } catch (err) {
        logModuleError("Dashboard", "useDashboardOverview", err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
  });
}

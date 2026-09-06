import { useMemo } from "react";
import type { CommunityMission } from "@/shared/models/dashboard";

interface ProgressParams {
  hasCompletedProfile: boolean;
  hasShifts: boolean;
  hasTransactions: boolean;
  role: string | null;
}

export function useCommunityProgress({
  hasCompletedProfile,
  hasShifts,
  hasTransactions,
  role,
}: ProgressParams) {
  const missions: CommunityMission[] = useMemo(() => [
    {
      id: "profile",
      title: "Lengkapi Profil Driver",
      desc: "Isi nama pangkalan, nomor darurat, dan nomor plat kendaraan.",
      completed: hasCompletedProfile,
      link: "/profil",
      actionText: "Lengkapi Profil",
    },
    {
      id: "piket",
      title: "Pilih Jadwal Piket Satgas",
      desc: "Ambil slot piket untuk menjaga keamanan rekan sesama driver.",
      completed: hasShifts,
      link: "/piket",
      actionText: "Ambil Slot Piket",
    },
    {
      id: "kas",
      title: "Transparansi Kas Komunitas",
      desc: "Pahami iuran sosial dan simpanan koperasi saling bantu.",
      completed: hasTransactions,
      link: "/kas",
      actionText: "Lihat Buku Kas",
    },
  ], [hasCompletedProfile, hasShifts, hasTransactions]);

  const completedCount = missions.filter((m) => m.completed).length;
  const currentLevel = completedCount + 1;
  const nextMission = missions.find((m) => !m.completed) ?? null;
  const progressPercent = Math.round((completedCount / missions.length) * 100);

  return {
    missions,
    completedCount,
    currentLevel,
    nextMission,
    progressPercent,
    isFullyOnboarded: completedCount === missions.length,
    roleTitle: role ? role.toUpperCase() : "ANGGOTA",
  };
}

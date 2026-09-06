export interface ShiftSummary {
  wilayah: string;
  slot: string;
  personil: number;
}

export interface ActivityFeedItem {
  at: string;
  tag: "SOS" | "Kas";
  tone: "signal" | "success" | "muted";
  text: string;
}

export interface DashboardOverview {
  anggotaAktif: number;
  anggotaTotal: number;
  saldo: number;
  masukBulanIni: number;
  menunggu: number;
  insidenBulanIni: number;
  insidenAktif: number;
  shiftHariIni: number;
  wilayahHariIni: number;
  piket: ShiftSummary[];
  feed: ActivityFeedItem[];
}

export interface CommunityMission {
  id: string;
  title: string;
  desc: string;
  completed: boolean;
  link: string;
  actionText: string;
}

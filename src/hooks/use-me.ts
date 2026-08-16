import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-my-role";

const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  bendahara: "Bendahara",
  satgas: "Satgas",
  anggota: "Anggota",
};

const ROLE_ORDER: AppRole[] = [
  "super_admin",
  "admin",
  "dewan_etik",
  "bendahara",
  "satgas",
  "anggota",
];

export type Me = {
  id: string | null;
  email: string | null;
  name: string | null;
  roles: AppRole[];
  roleLabel: string;
  initials: string;
  status: "aktif" | "nonaktif" | "cuti" | "pending_review" | null;
  isPendingReview: boolean;
};

export function useMe() {
  return useQuery<Me>({
    queryKey: ["me-identity"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const empty: Me = {
        id: null,
        email: null,
        name: null,
        roles: [],
        roleLabel: "Anggota",
        initials: "",
        status: null,
        isPendingReview: false,
      };
      if (!u.user) return empty;

      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("nama, status").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);

      const meta = (u.user.user_metadata ?? {}) as Record<string, string | undefined>;
      const name =
        p?.nama ??
        meta.nama ??
        meta.full_name ??
        meta.name ??
        (u.user.email ? u.user.email.split("@")[0]! : null);

      const roles = ((r ?? []).map((x) => x.role) as AppRole[]) ?? [];
      const top = ROLE_ORDER.find((role) => roles.includes(role));

      const initials = (name ?? u.user.email ?? "?")
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .map((s) => s[0]!.toUpperCase())
        .slice(0, 2)
        .join("");

      return {
        id: u.user.id,
        email: u.user.email ?? null,
        name: name ?? null,
        roles,
        roleLabel: top ? ROLE_LABEL[top] : "Anggota",
        initials,
        status: (p?.status ?? null) as Me["status"],
        isPendingReview: p?.status === "pending_review",
      };
    },
  });
}
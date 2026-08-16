import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin"
  | "admin"
  | "bendahara"
  | "satgas"
  | "anggota"
  | "dewan_etik";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as AppRole[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function useIs(role: AppRole) {
  const { data = [] } = useMyRoles();
  return data.includes(role) || data.includes("super_admin") || data.includes("admin");
}

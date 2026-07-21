import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Settings } from "lucide-react";

export function UserMenu() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["me-identity"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { email: null as string | null, name: null as string | null };
      const { data: p } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", u.user.id)
        .maybeSingle();
      const meta = u.user.user_metadata ?? {};
      const name =
        (p?.nama as string | undefined) ??
        (meta.nama as string | undefined) ??
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        (u.user.email ? u.user.email.split("@")[0] : null);
      return { email: u.user.email ?? null, name: name ?? null };
    },
  });
  const email = data?.email ?? null;
  const name = data?.name ?? null;

  const initials = (name ?? email ?? "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase())
    .slice(0, 2)
    .join("");

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary transition hover:bg-primary/25">
        {initials || <UserIcon className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{name ?? "Anggota DRG"}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email ?? ""}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profil" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" /> Profil & Preferensi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-signal focus:text-signal">
          <LogOut className="mr-2 h-4 w-4" /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

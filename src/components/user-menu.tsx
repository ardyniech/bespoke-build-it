import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      setEmail(u?.email ?? null);
      setName((u?.user_metadata?.full_name as string) ?? (u?.user_metadata?.name as string) ?? null);
    });
    return () => { mounted = false; };
  }, []);

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

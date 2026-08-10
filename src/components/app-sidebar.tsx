import { Link, useRouterState } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-me";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Siren,
  Map,
  CalendarClock,
  ClipboardList,
  FileText,
  Boxes,
  GraduationCap,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const operasional = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "SOS & Kejadian", url: "/kejadian", icon: Siren },
  { title: "Peta & Lokasi", url: "/peta", icon: Map },
  { title: "Piket Satgas", url: "/piket", icon: CalendarClock },
];

const administrasiBase = [
  { title: "Data Anggota", url: "/anggota", icon: Users },
  { title: "Kas & Keuangan", url: "/kas", icon: Wallet },
  { title: "Notulen Rapat", url: "/notulen", icon: FileText },
  { title: "Inventaris", url: "/inventaris", icon: Boxes },
];

const kaderisasi = [
  { title: "Screening Calon", url: "/screening", icon: ClipboardList },
  { title: "Evaluasi Jenjang", url: "/kaderisasi", icon: GraduationCap },
  { title: "Dewan Etik", url: "/etik", icon: ShieldAlert },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: me } = useMe();
  const initials = me?.initials || "?";
  const isAdmin = !!me?.roles.some((r) => r === "admin" || r === "super_admin");
  const administrasi = isAdmin
    ? [...administrasiBase, { title: "Persetujuan Akun", url: "/persetujuan", icon: UserCheck }]
    : administrasiBase;
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(url);
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" onClick={handleNavClick} className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">D</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold text-sidebar-foreground">
                DRG App
              </span>
              <span className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">
                Riang Gembira
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {[
          { label: "Operasional", items: operasional },
          { label: "Administrasi", items: administrasi },
          { label: "Kaderisasi", items: kaderisasi },
        ].map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold"
                    >
                      <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-accent font-display text-sm font-bold text-sidebar-accent-foreground">
              {initials}
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {me?.name ?? "Anggota DRG"}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {me?.roleLabel ?? "Anggota"}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-sidebar-accent font-display text-sm font-bold text-sidebar-accent-foreground">
            {initials}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
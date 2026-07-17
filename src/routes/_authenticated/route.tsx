import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { Siren } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-3 backdrop-blur md:px-6">
            <SidebarTrigger className="text-foreground" />
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              Sistem online
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline text-xs capitalize text-muted-foreground">
                {today}
              </span>
              <Button
                asChild
                size="sm"
                className="bg-signal text-signal-foreground shadow-warm hover:bg-signal/90"
              >
                <Link to="/kejadian">
                  <Siren className="mr-1.5 h-4 w-4" /> SOS
                </Link>
              </Button>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

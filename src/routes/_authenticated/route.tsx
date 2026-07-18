import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { Siren, Radio, RadioTower } from "lucide-react";
import { useLiveLocation } from "@/hooks/use-live-location";
import { toast } from "sonner";

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
  const { user } = Route.useRouteContext();
  const { onBit, setOnBit, error, hydrated } = useLiveLocation(user?.id);
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
              <button
                type="button"
                onClick={() => {
                  const next = !onBit;
                  setOnBit(next);
                  toast[next ? "success" : "message"](
                    next ? "On-Bit aktif — lokasi live dibagikan" : "On-Bit dimatikan — lokasi berhenti",
                  );
                }}
                title={
                  hydrated
                    ? onBit
                      ? "Ngebit — lokasi live aktif. Klik untuk berhenti."
                      : "Off-Bit — klik untuk mulai share lokasi."
                    : "Memuat GPS…"
                }
                className={
                  "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition " +
                  (onBit
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground")
                }
              >
                {onBit ? (
                  <RadioTower className="h-3 w-3 animate-pulse" />
                ) : (
                  <Radio className="h-3 w-3" />
                )}
                {onBit ? "On-Bit" : "Off-Bit"}
              </button>
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
          {onBit && error ? (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-center text-[11px] text-amber-800 md:px-6">
              GPS tidak bisa diakses: {error}. Cek izin lokasi browser.
            </div>
          ) : null}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

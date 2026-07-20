import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verifikasi/$token")({
  head: () => ({ meta: [{ title: "Verifikasi Email — DRG" }] }),
  component: VerifikasiPage,
});

function VerifikasiPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<"loading" | "ok" | "already" | "fail">("loading");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("verify_application_email", { _token: token });
      if (error) return setState("fail");
      setState(data ? "ok" : "already");
    })();
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      {state === "loading" ? (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      ) : state === "fail" ? (
        <>
          <XCircle className="h-14 w-14 text-destructive" />
          <h1 className="mt-3 font-display text-2xl font-bold">Token tidak valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">Link verifikasi kadaluarsa atau sudah dipakai.</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h1 className="mt-3 font-display text-2xl font-bold">
            {state === "ok" ? "Email terverifikasi!" : "Sudah terverifikasi sebelumnya"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            PIC Kaderisasi akan menghubungi kamu untuk tahap wawancara.
          </p>
          <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/status/$token" params={{ token }}>Lihat Status Aplikasi</Link>
          </Button>
        </>
      )}
    </div>
  );
}
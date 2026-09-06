import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthNoticeCard, AuthCardTabs, useAuthActions } from "@/modules/auth";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Masuk & Daftar — DRG App" },
      { name: "description", content: "Masuk atau daftar akun anggota Komunitas Driver Riang Gembira (DRG)." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const auth = useAuthActions();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">D</span>
          </div>
          <span className="font-display text-lg font-bold">DRG App</span>
        </Link>

        {auth.unconfirmedEmail ? (
          <AuthNoticeCard
            email={auth.unconfirmedEmail}
            onBackToSignIn={() => auth.setUnconfirmedEmail(null)}
            onResendEmail={auth.handleResendEmail}
            resending={auth.resending}
          />
        ) : (
          <AuthCardTabs
            tab={tab}
            setTab={setTab}
            email={auth.email}
            setEmail={auth.setEmail}
            password={auth.password}
            setPassword={auth.setPassword}
            fullName={auth.fullName}
            setFullName={auth.setFullName}
            loading={auth.loading}
            onSignIn={auth.handleSignIn}
            onSignUp={auth.handleSignUp}
            onGoogle={auth.handleGoogle}
          />
        )}

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

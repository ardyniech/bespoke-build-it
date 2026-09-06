import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

interface Props {
  tab: "signin" | "signup";
  setTab: (val: "signin" | "signup") => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  fullName: string;
  setFullName: (val: string) => void;
  loading: boolean;
  onSignIn: (e: React.FormEvent) => void;
  onSignUp: (e: React.FormEvent) => void;
  onGoogle: () => void;
}

export function AuthCardTabs({
  tab,
  setTab,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  loading,
  onSignIn,
  onSignUp,
  onGoogle,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Masuk</TabsTrigger>
          <TabsTrigger value="signup">Daftar</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <SignInForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            onSubmit={onSignIn}
          />
        </TabsContent>
        <TabsContent value="signup">
          <SignUpForm
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            onSubmit={onSignUp}
          />
        </TabsContent>
      </Tabs>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
        Lanjutkan dengan Google
      </Button>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Dengan masuk, kamu setuju pada tata tertib Komunitas Driver Riang Gembira.
      </p>
    </div>
  );
}

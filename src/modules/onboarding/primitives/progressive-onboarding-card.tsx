import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CommunityMission } from "@/shared/models/dashboard";

interface Props {
  level: number;
  progressPercent: number;
  nextMission: CommunityMission | null;
  roleTitle: string;
}

export function ProgressiveOnboardingCard({
  level,
  progressPercent,
  nextMission,
  roleTitle,
}: Props) {
  if (!nextMission) {
    return (
      <div className="mb-6 rounded-2xl border border-success/30 bg-success/10 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <h4 className="font-bold text-foreground">Akun Driver Siap Penuh (Level {level})</h4>
            <p className="text-xs text-muted-foreground">
              Semua modul komunitas telah aktif untuk peran {roleTitle}. Tetap jaga keselamatan di jalan!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/40 bg-card p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-accent text-accent-foreground font-semibold">
              <Sparkles className="mr-1 h-3 w-3 text-accent" /> Level {level} Driver
            </Badge>
            <span className="text-xs text-muted-foreground">
              {progressPercent}% Langkah Terpenuhi
            </span>
          </div>
          <h3 className="mt-2 font-display text-base font-bold text-foreground">
            Langkah Selanjutnya: {nextMission.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            {nextMission.desc}
          </p>
        </div>
        <Button
          size="sm"
          className="min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
          asChild
        >
          <Link to={nextMission.link}>
            {nextMission.actionText} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

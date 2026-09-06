import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ShiftSummary } from "@/shared/models/dashboard";

const SLOT_TIME: Record<string, string> = {
  pagi: "06:00 – 12:00",
  siang: "12:00 – 18:00",
  malam: "18:00 – 00:00",
};

interface Props {
  piket: ShiftSummary[];
}

export function DashboardPiketGrid({ piket }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Satgas Piket Hari Ini
          </h3>
          <p className="text-xs text-muted-foreground">
            Distribusi rekan jaga per wilayah operasional.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/piket">Lihat Roster →</Link>
        </Button>
      </div>

      {piket.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            Belum ada rekan yang mendaftar piket hari ini.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ambil giliran jaga untuk memperkuat jejaring keselamatan komunitas.
          </p>
          <Button size="sm" className="mt-4" asChild>
            <Link to="/piket">Ambil Slot Piket</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {piket.map((p) => (
            <div
              key={`${p.wilayah}-${p.slot}`}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold capitalize text-foreground">
                    {p.wilayah}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Slot {p.slot} ({SLOT_TIME[p.slot] || p.slot})
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {p.personil} orang
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

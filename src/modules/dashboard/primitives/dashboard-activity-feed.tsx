import { Badge } from "@/components/ui/badge";
import { formatJam } from "@/shared/utils/formatters";
import type { ActivityFeedItem } from "@/shared/models/dashboard";

interface Props {
  feed: ActivityFeedItem[];
}

export function DashboardActivityFeed({ feed }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold text-foreground">
          Aktivitas Terbaru
        </h3>
        <p className="text-xs text-muted-foreground">
          Laporan darurat dan mutasi kas komunitas secara real-time.
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada aktivitas baru.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item, idx) => (
            <div
              key={`${item.at}-${idx}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-3"
            >
              <div className="flex items-start gap-2.5">
                <Badge
                  variant={item.tone === "signal" ? "destructive" : "secondary"}
                  className="mt-0.5 text-[10px] uppercase font-bold"
                >
                  {item.tag}
                </Badge>
                <div>
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {item.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {formatJam(item.at)} WIB
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

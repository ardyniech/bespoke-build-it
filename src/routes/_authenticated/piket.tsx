import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/piket")({
  head: () => ({ meta: [{ title: "Piket Satgas — DRG App" }] }),
  component: PiketPage,
});

const hari = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const wilayah = ["Klojen", "Blimbing", "Sukun", "Lowokwaru", "Kedungkandang"];
const nama = ["Parjo", "Yanto", "Roni", "Sulis", "Slamet", "Dimas", "—"];

function PiketPage() {
  return (
    <PageShell
      eyebrow="PIC Satgas"
      title="Jadwal Piket Wilayah"
      description="Kalender piket per wilayah. Shift pagi 06–12, siang 12–18, malam 18–00."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1.5 h-4 w-4" /> Susun Shift
        </Button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Wilayah</th>
              {hari.map((h) => (
                <th key={h} className="px-3 py-3 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {wilayah.map((w, i) => (
              <tr key={w}>
                <td className="px-4 py-3 font-semibold">{w}</td>
                {hari.map((h, j) => {
                  const n = nama[(i + j) % nama.length];
                  const empty = n === "—";
                  return (
                    <td key={h} className="px-2 py-2 text-center">
                      <span
                        className={
                          "inline-flex min-w-[64px] items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium " +
                          (empty
                            ? "border border-dashed border-border text-muted-foreground/60"
                            : "bg-primary/10 text-primary")
                        }
                      >
                        {empty ? "kosong" : n}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const { data: stats } = await supabase
    .from("team_overall_stats")
    .select("team_id, played, wins, losses, cups_for, cups_against")
    .gt("played", 0);

  const teamIds = (stats ?? []).map((s) => s.team_id);
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] };

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const rows = (stats ?? [])
    .map((s) => ({
      ...s,
      name: teamNameById.get(s.team_id) ?? "Unbekanntes Team",
      diff: s.cups_for - s.cups_against,
    }))
    .sort((a, b) => b.wins - a.wins || b.diff - a.diff);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold text-primary">
        Rangliste
      </h1>

      {rows.length === 0 ? (
        <Card className="text-center text-muted-foreground">
          Noch keine gespielten Matches — die Rangliste füllt sich mit dem ersten Turnier.
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-normal">#</th>
                <th className="pb-2 font-normal">Team</th>
                <th className="pb-2 text-center font-normal">Spiele</th>
                <th className="pb-2 text-center font-normal">S</th>
                <th className="pb-2 text-center font-normal">N</th>
                <th className="pb-2 text-right font-normal">Becher</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.team_id} className="border-t border-border">
                  <td className="py-2">
                    {idx === 0 ? (
                      <Trophy size={18} weight="fill" className="text-primary" />
                    ) : (
                      idx + 1
                    )}
                  </td>
                  <td className={cn("py-2 font-medium", idx === 0 && "text-primary")}>
                    {r.name}
                  </td>
                  <td className="py-2 text-center">{r.played}</td>
                  <td className="py-2 text-center">{r.wins}</td>
                  <td className="py-2 text-center">{r.losses}</td>
                  <td className="py-2 text-right">
                    {r.cups_for}:{r.cups_against}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}

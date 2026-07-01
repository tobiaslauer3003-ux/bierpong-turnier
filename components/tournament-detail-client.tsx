"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarBlank, UsersThree, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchCard } from "@/components/match-card";
import { createClient } from "@/lib/supabase/client";
import {
  generateBracket,
  generateGroupStage,
  generatePlayoffs,
} from "@/lib/actions/tournaments";
import { suggestGroupCount } from "@/lib/bracket";
import type { Match, Tournament, TournamentTeam } from "@/lib/database.types";

type Team = { id: string; name: string; player1_id: string; player2_id: string | null };

const statusLabel: Record<string, string> = {
  draft: "Geplant",
  group_stage: "Gruppenphase läuft",
  ko_stage: "K.o.-Runde läuft",
  finished: "Turnier beendet",
};

export function TournamentDetailClient({
  tournament,
  tournamentTeams,
  teams,
  initialMatches,
  isOrganizer,
  myTeamId,
}: {
  tournament: Tournament;
  tournamentTeams: TournamentTeam[];
  teams: Team[];
  initialMatches: Match[];
  isOrganizer: boolean;
  myTeamId: string | null;
}) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numGroups, setNumGroups] = useState(suggestGroupCount(tournamentTeams.length));

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const groupByTeam = useMemo(() => {
    const map = new Map<string, string>();
    for (const tt of tournamentTeams) if (tt.group_name) map.set(tt.team_id, tt.group_name);
    return map;
  }, [tournamentTeams]);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tournament-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        (payload) => {
          setMatches((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((m) => m.id !== (payload.old as Match).id);
            }
            const updated = payload.new as Match;
            const exists = prev.some((m) => m.id === updated.id);
            return exists
              ? prev.map((m) => (m.id === updated.id ? updated : m))
              : [...prev, updated];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournaments",
          filter: `id=eq.${tournament.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournament.id, router]);

  async function handleGenerateBracket() {
    setPending(true);
    setError(null);
    const res = await generateBracket(tournament.id);
    setPending(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleGenerateGroupStage() {
    setPending(true);
    setError(null);
    const res = await generateGroupStage(tournament.id, numGroups);
    setPending(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  async function handleGeneratePlayoffs() {
    setPending(true);
    setError(null);
    const res = await generatePlayoffs(tournament.id);
    setPending(false);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  const groupMatches = matches.filter((m) => m.stage === "group");
  const koMatches = matches.filter((m) => m.stage === "ko");
  const allGroupMatchesDone = groupMatches.length > 0 && groupMatches.every((m) => m.status === "done");

  function canEnterScore(match: Match) {
    if (match.status !== "ready") return false;
    if (isOrganizer) return true;
    return !!myTeamId && (match.team_a_id === myTeamId || match.team_b_id === myTeamId);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">{tournament.name}</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarBlank size={16} />
            {new Date(tournament.date).toLocaleDateString("de-DE")}
            {" · "}
            {tournament.mode === "ko" ? "K.o.-System" : "Gruppenphase"}
          </p>
        </div>
        <span className="rounded-full bg-surface-raised px-4 py-1.5 text-sm font-semibold">
          {statusLabel[tournament.status] ?? tournament.status}
        </span>
      </div>

      <Card className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <UsersThree size={20} className="text-primary" />
        {tournamentTeams.length} Teams angemeldet
      </Card>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {isOrganizer && tournament.status === "draft" && tournament.mode === "ko" && (
        <Card className="mb-6">
          <p className="mb-3 text-sm">Bereit für den ersten Wurf? Starte den K.o.-Baum.</p>
          <Button onClick={handleGenerateBracket} disabled={pending}>
            <Sparkle size={18} />
            {pending ? "Wird erstellt…" : "K.o.-Baum starten"}
          </Button>
        </Card>
      )}

      {isOrganizer && tournament.status === "draft" && tournament.mode === "gruppenphase" && (
        <Card className="mb-6">
          <label className="mb-2 block text-sm font-medium">Anzahl Gruppen</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={Math.floor(tournamentTeams.length / 2)}
              value={numGroups}
              onChange={(e) => setNumGroups(Number(e.target.value))}
              className="h-11 w-24 rounded-xl border-2 border-border bg-background px-3 text-center outline-none focus:border-primary"
            />
            <Button onClick={handleGenerateGroupStage} disabled={pending}>
              <Sparkle size={18} />
              {pending ? "Wird erstellt…" : "Gruppenphase starten"}
            </Button>
          </div>
        </Card>
      )}

      {isOrganizer && tournament.status === "group_stage" && (
        <Card className="mb-6">
          <p className="mb-3 text-sm">
            {allGroupMatchesDone
              ? "Alle Gruppenspiele sind abgeschlossen — bereit für die Playoffs!"
              : "Playoffs starten, sobald alle Gruppenspiele abgeschlossen sind."}
          </p>
          <Button onClick={handleGeneratePlayoffs} disabled={pending || !allGroupMatchesDone}>
            <Sparkle size={18} />
            {pending ? "Wird erstellt…" : "Playoffs starten"}
          </Button>
        </Card>
      )}

      {groupMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-heading text-xl font-bold">Gruppenphase</h2>
          <GroupStandings
            matches={groupMatches}
            teamsById={teamsById}
            groupByTeam={groupByTeam}
          />
          <div className="mt-4 flex flex-col gap-3">
            {groupMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                teamA={m.team_a_id ? (teamsById.get(m.team_a_id) ?? null) : null}
                teamB={m.team_b_id ? (teamsById.get(m.team_b_id) ?? null) : null}
                canEnterScore={canEnterScore(m)}
                myTeamId={myTeamId}
              />
            ))}
          </div>
        </section>
      )}

      {koMatches.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-xl font-bold">K.o.-Runde</h2>
          <BracketView
            matches={koMatches}
            teamsById={teamsById}
            canEnterScore={canEnterScore}
            myTeamId={myTeamId}
          />
        </section>
      )}

      {matches.length === 0 && (
        <Card className="text-center text-muted-foreground">
          {isOrganizer
            ? "Starte den Turnierplan über die Box oben."
            : "Der Organisator hat den Turnierplan noch nicht gestartet."}
        </Card>
      )}
    </main>
  );
}

function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Halbfinale";
  if (fromEnd === 2) return "Viertelfinale";
  return `Runde ${round}`;
}

function BracketView({
  matches,
  teamsById,
  canEnterScore,
  myTeamId,
}: {
  matches: Match[];
  teamsById: Map<string, Team>;
  canEnterScore: (m: Match) => boolean;
  myTeamId: string | null;
}) {
  const rounds = useMemo(() => {
    const grouped = new Map<number, Match[]>();
    for (const m of matches) {
      const list = grouped.get(m.round) ?? [];
      list.push(m);
      grouped.set(m.round, list);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([round, list]) => ({
        round,
        matches: list.sort((a, b) => a.match_order - b.match_order),
      }));
  }, [matches]);

  const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1].round : 0;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4">
      <div className="flex gap-6">
        {rounds.map(({ round, matches: roundMatches }) => (
          <div key={round} className="flex flex-col gap-4">
            <h3 className="font-heading text-sm font-semibold uppercase text-muted-foreground">
              {roundLabel(round, totalRounds)}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-6">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  teamA={m.team_a_id ? (teamsById.get(m.team_a_id) ?? null) : null}
                  teamB={m.team_b_id ? (teamsById.get(m.team_b_id) ?? null) : null}
                  canEnterScore={canEnterScore(m)}
                  myTeamId={myTeamId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupStandings({
  matches,
  teamsById,
  groupByTeam,
}: {
  matches: Match[];
  teamsById: Map<string, Team>;
  groupByTeam: Map<string, string>;
}) {
  const standings = useMemo(() => {
    type TeamStats = {
      teamId: string;
      wins: number;
      losses: number;
      cupsFor: number;
      cupsAgainst: number;
    };
    const stats = new Map<string, TeamStats>();

    function ensure(teamId: string) {
      if (!stats.has(teamId)) {
        stats.set(teamId, { teamId, wins: 0, losses: 0, cupsFor: 0, cupsAgainst: 0 });
      }
      return stats.get(teamId)!;
    }

    for (const m of matches) {
      if (m.status !== "done" || !m.team_a_id || !m.team_b_id) continue;
      const a = ensure(m.team_a_id);
      const b = ensure(m.team_b_id);
      a.cupsFor += m.score_a ?? 0;
      a.cupsAgainst += m.score_b ?? 0;
      b.cupsFor += m.score_b ?? 0;
      b.cupsAgainst += m.score_a ?? 0;
      if (m.winner_id === m.team_a_id) {
        a.wins++;
        b.losses++;
      } else {
        b.wins++;
        a.losses++;
      }
    }

    const byGroup = new Map<string, TeamStats[]>();
    for (const s of stats.values()) {
      const group = groupByTeam.get(s.teamId) ?? "?";
      const list = byGroup.get(group) ?? [];
      list.push(s);
      byGroup.set(group, list);
    }
    for (const list of byGroup.values()) {
      list.sort((a, b) => b.wins - a.wins || b.cupsFor - b.cupsAgainst - (a.cupsFor - a.cupsAgainst));
    }
    return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches, groupByTeam]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {standings.map(([group, rows]) => (
        <Card key={group}>
          <h3 className="mb-2 font-heading font-semibold">Gruppe {group}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1 font-normal">Team</th>
                <th className="pb-1 text-center font-normal">S</th>
                <th className="pb-1 text-center font-normal">N</th>
                <th className="pb-1 text-right font-normal">Becher</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teamId} className="border-t border-border">
                  <td className="py-1.5 font-medium">
                    {teamsById.get(r.teamId)?.name ?? "?"}
                  </td>
                  <td className="py-1.5 text-center">{r.wins}</td>
                  <td className="py-1.5 text-center">{r.losses}</td>
                  <td className="py-1.5 text-right">
                    {r.cupsFor}:{r.cupsAgainst}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

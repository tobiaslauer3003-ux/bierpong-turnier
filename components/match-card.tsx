"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";
import { submitMatchResult } from "@/lib/actions/tournaments";
import type { Match } from "@/lib/database.types";

type TeamInfo = { id: string; name: string } | null;

export function MatchCard({
  match,
  teamA,
  teamB,
  canEnterScore,
  myTeamId,
}: {
  match: Match;
  teamA: TeamInfo;
  teamB: TeamInfo;
  canEnterScore: boolean;
  myTeamId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
      setError("Bitte gültige, unterschiedliche Becherzahlen eingeben");
      return;
    }
    setPending(true);
    setError(null);
    const res = await submitMatchResult(match.id, a, b);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditing(false);
    const winnerId = a > b ? teamA?.id : teamB?.id;
    if (winnerId && myTeamId && winnerId === myTeamId) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#F59E0B", "#FBBF24", "#22C55E"],
      });
    }
  }

  const isBye = match.status === "done" && (!teamA || !teamB);

  return (
    <div className="w-64 shrink-0 rounded-2xl border-2 border-border bg-surface p-3 shadow-[0_3px_0_0_var(--color-border)]">
      <TeamRow
        team={teamA}
        score={match.score_a}
        isWinner={match.winner_id === teamA?.id && !!match.winner_id}
      />
      <div className="my-1 border-t border-border" />
      <TeamRow
        team={teamB}
        score={match.score_b}
        isWinner={match.winner_id === teamB?.id && !!match.winner_id}
      />

      {isBye && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Freilos</p>
      )}

      {canEnterScore && match.status === "ready" && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="mt-2 w-full cursor-pointer rounded-lg bg-primary/10 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20"
        >
          Ergebnis eintragen
        </button>
      )}

      {editing && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              placeholder={teamA?.name ?? "A"}
              className="h-9 w-full rounded-lg border-2 border-border bg-background px-2 text-center text-sm outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">:</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              placeholder={teamB?.name ?? "B"}
              className="h-9 w-full rounded-lg border-2 border-border bg-background px-2 text-center text-sm outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 cursor-pointer rounded-lg bg-primary py-1.5 text-sm font-semibold text-primary-foreground active:scale-95 disabled:opacity-50"
            >
              {pending ? "…" : "Speichern"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-raised"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
}: {
  team: TeamInfo;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5",
        isWinner && "bg-success/10",
      )}
    >
      <span
        className={cn(
          "truncate text-sm",
          team ? "font-medium" : "italic text-muted-foreground",
          isWinner && "font-bold text-success",
        )}
      >
        {team?.name ?? "TBD"}
      </span>
      <span className="flex items-center gap-1 text-sm font-heading font-bold">
        {isWinner && <Trophy size={14} weight="fill" className="text-success" />}
        {score ?? ""}
      </span>
    </div>
  );
}

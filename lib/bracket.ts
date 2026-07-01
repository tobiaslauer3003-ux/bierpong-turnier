export type MatchStage = "group" | "ko";
export type MatchStatus = "pending" | "ready" | "done";

export interface MatchInsert {
  tournament_id: string;
  stage: MatchStage;
  round: number;
  match_order: number;
  group_name: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_id: string | null;
  status: MatchStatus;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Baut einen K.o.-Baum: zufällige Setzung, Freilose an die ersten Slots,
 * die direkt in Runde 2 weiterpropagiert werden.
 */
export function buildKoMatches(
  tournamentId: string,
  teamIds: string[],
): MatchInsert[] {
  if (teamIds.length < 2) {
    throw new Error("Mindestens 2 Teams nötig, um einen K.o.-Baum zu starten");
  }

  const seeds = shuffle(teamIds);
  const n = seeds.length;
  const bracketSize = nextPowerOfTwo(n);
  const round1Size = bracketSize / 2;
  const byes = bracketSize - n;

  const byeTeams = seeds.slice(0, byes);
  const pairedTeams = seeds.slice(byes);

  const matches: MatchInsert[] = [];

  for (let i = 0; i < byes; i++) {
    matches.push({
      tournament_id: tournamentId,
      stage: "ko",
      round: 1,
      match_order: i,
      group_name: null,
      team_a_id: byeTeams[i],
      team_b_id: null,
      score_a: null,
      score_b: null,
      winner_id: byeTeams[i],
      status: "done",
    });
  }

  for (let i = byes; i < round1Size; i++) {
    const pairIndex = i - byes;
    matches.push({
      tournament_id: tournamentId,
      stage: "ko",
      round: 1,
      match_order: i,
      group_name: null,
      team_a_id: pairedTeams[pairIndex * 2],
      team_b_id: pairedTeams[pairIndex * 2 + 1],
      score_a: null,
      score_b: null,
      winner_id: null,
      status: "ready",
    });
  }

  const totalRounds = Math.log2(bracketSize);
  let matchesInRound = round1Size;
  for (let r = 2; r <= totalRounds; r++) {
    matchesInRound = matchesInRound / 2;
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        stage: "ko",
        round: r,
        match_order: i,
        group_name: null,
        team_a_id: null,
        team_b_id: null,
        score_a: null,
        score_b: null,
        winner_id: null,
        status: "pending",
      });
    }
  }

  for (let i = 0; i < byes; i++) {
    const nextOrder = Math.floor(i / 2);
    const next = matches.find((m) => m.round === 2 && m.match_order === nextOrder);
    if (!next) continue;
    if (i % 2 === 0) next.team_a_id = byeTeams[i];
    else next.team_b_id = byeTeams[i];
    if (next.team_a_id && next.team_b_id) next.status = "ready";
  }

  return matches;
}

/** Alle Paarungen einer Gruppe (Round Robin, "jeder gegen jeden"). */
export function buildGroupMatches(
  tournamentId: string,
  groupName: string,
  teamIds: string[],
): MatchInsert[] {
  const matches: MatchInsert[] = [];
  let order = 0;
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push({
        tournament_id: tournamentId,
        stage: "group",
        round: 1,
        match_order: order++,
        group_name: groupName,
        team_a_id: teamIds[i],
        team_b_id: teamIds[j],
        score_a: null,
        score_b: null,
        winner_id: null,
        status: "ready",
      });
    }
  }
  return matches;
}

/** Verteilt Teams zufällig auf Gruppen A, B, C, ... */
export function assignGroups(teamIds: string[], numGroups: number): Record<string, string> {
  const shuffled = shuffle(teamIds);
  const groupNames = Array.from({ length: numGroups }, (_, i) => String.fromCharCode(65 + i));
  const assignment: Record<string, string> = {};
  shuffled.forEach((team, idx) => {
    assignment[team] = groupNames[idx % numGroups];
  });
  return assignment;
}

export function suggestGroupCount(teamCount: number): number {
  return Math.max(1, Math.round(teamCount / 4));
}

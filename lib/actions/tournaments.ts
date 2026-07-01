"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tournamentNameSchema } from "@/lib/validation";
import {
  buildKoMatches,
  buildGroupMatches,
  assignGroups,
  suggestGroupCount,
} from "@/lib/bracket";
import type { TournamentMode } from "@/lib/database.types";

export type ActionState = { error?: string; ok?: boolean };

export async function createTournament(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt" };

  const nameParsed = tournamentNameSchema.safeParse(formData.get("name"));
  if (!nameParsed.success) {
    return { error: nameParsed.error.issues[0]?.message ?? "Ungültiger Name" };
  }

  const date = formData.get("date") as string;
  if (!date) return { error: "Bitte ein Datum wählen" };

  const mode = formData.get("mode") as TournamentMode;
  if (mode !== "ko" && mode !== "gruppenphase") {
    return { error: "Ungültiger Modus" };
  }

  const teamIds = formData.getAll("teamIds") as string[];
  if (teamIds.length < 2) {
    return { error: "Mindestens 2 Teams auswählen" };
  }

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({ name: nameParsed.data, date, mode, organizer_id: user.id })
    .select("id")
    .single();

  if (error || !tournament) {
    return { error: "Turnier konnte nicht erstellt werden: " + error?.message };
  }

  const { error: teamsError } = await supabase
    .from("tournament_teams")
    .insert(teamIds.map((teamId) => ({ tournament_id: tournament.id, team_id: teamId })));

  if (teamsError) {
    return { error: "Teams konnten nicht zugeordnet werden: " + teamsError.message };
  }

  redirect(`/tournaments/${tournament.id}`);
}

async function assertOrganizer(tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, organizer_id, status, mode, teams_per_group_advance")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Turnier nicht gefunden");
  if (tournament.organizer_id !== user.id) {
    throw new Error("Nur der Organisator kann diese Aktion ausführen");
  }
  return { supabase, tournament };
}

export async function generateBracket(tournamentId: string): Promise<ActionState> {
  try {
    const { supabase, tournament } = await assertOrganizer(tournamentId);
    if (tournament.status !== "draft") {
      return { error: "Turnier wurde bereits gestartet" };
    }

    const { data: tt } = await supabase
      .from("tournament_teams")
      .select("team_id")
      .eq("tournament_id", tournamentId);

    const teamIds = (tt ?? []).map((t) => t.team_id);
    if (teamIds.length < 2) return { error: "Mindestens 2 Teams nötig" };

    const matches = buildKoMatches(tournamentId, teamIds);

    const admin = await createAdminClient();
    const { error: insertError } = await admin.from("matches").insert(matches);
    if (insertError) return { error: insertError.message };

    await supabase.from("tournaments").update({ status: "ko_stage" }).eq("id", tournamentId);

    revalidatePath(`/tournaments/${tournamentId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function generateGroupStage(
  tournamentId: string,
  numGroups?: number,
): Promise<ActionState> {
  try {
    const { supabase, tournament } = await assertOrganizer(tournamentId);
    if (tournament.status !== "draft") {
      return { error: "Turnier wurde bereits gestartet" };
    }

    const { data: tt } = await supabase
      .from("tournament_teams")
      .select("team_id")
      .eq("tournament_id", tournamentId);

    const teamIds = (tt ?? []).map((t) => t.team_id);
    if (teamIds.length < 3) return { error: "Mindestens 3 Teams für eine Gruppenphase nötig" };

    const groups = numGroups && numGroups > 0 ? numGroups : suggestGroupCount(teamIds.length);
    const assignment = assignGroups(teamIds, Math.min(groups, Math.floor(teamIds.length / 2)));

    const admin = await createAdminClient();

    for (const [teamId, groupName] of Object.entries(assignment)) {
      await admin
        .from("tournament_teams")
        .update({ group_name: groupName })
        .eq("tournament_id", tournamentId)
        .eq("team_id", teamId);
    }

    const byGroup: Record<string, string[]> = {};
    for (const [teamId, groupName] of Object.entries(assignment)) {
      (byGroup[groupName] ??= []).push(teamId);
    }

    const matches = Object.entries(byGroup).flatMap(([groupName, ids]) =>
      buildGroupMatches(tournamentId, groupName, ids),
    );

    const { error: insertError } = await admin.from("matches").insert(matches);
    if (insertError) return { error: insertError.message };

    await supabase.from("tournaments").update({ status: "group_stage" }).eq("id", tournamentId);

    revalidatePath(`/tournaments/${tournamentId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function generatePlayoffs(tournamentId: string): Promise<ActionState> {
  try {
    const { supabase, tournament } = await assertOrganizer(tournamentId);
    if (tournament.status !== "group_stage") {
      return { error: "Gruppenphase ist nicht aktiv" };
    }

    const { data: groupMatches } = await supabase
      .from("matches")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("stage", "group");

    if (!groupMatches || groupMatches.some((m) => m.status !== "done")) {
      return { error: "Noch nicht alle Gruppenspiele sind abgeschlossen" };
    }

    const { data: stats } = await supabase
      .from("team_match_stats")
      .select("team_id, wins, cups_for, cups_against")
      .eq("tournament_id", tournamentId)
      .eq("stage", "group");

    const { data: tt } = await supabase
      .from("tournament_teams")
      .select("team_id, group_name")
      .eq("tournament_id", tournamentId);

    const advancePerGroup = tournament.teams_per_group_advance ?? 2;
    const groups: Record<string, string[]> = {};
    for (const row of tt ?? []) {
      if (!row.group_name) continue;
      (groups[row.group_name] ??= []).push(row.team_id);
    }

    const statsById = new Map((stats ?? []).map((s) => [s.team_id, s]));
    const qualifiers: string[][] = Object.values(groups).map((teamIds) =>
      [...teamIds]
        .sort((a, b) => {
          const sa = statsById.get(a);
          const sb = statsById.get(b);
          const winsDiff = (sb?.wins ?? 0) - (sa?.wins ?? 0);
          if (winsDiff !== 0) return winsDiff;
          const diffA = (sa?.cups_for ?? 0) - (sa?.cups_against ?? 0);
          const diffB = (sb?.cups_for ?? 0) - (sb?.cups_against ?? 0);
          return diffB - diffA;
        })
        .slice(0, advancePerGroup),
    );

    // Kreuzen: 1. aus Gruppe i gegen 2. aus Gruppe i+1, um direkte Gruppen-Rematches zu vermeiden
    const seeded: string[] = [];
    const maxLen = Math.max(...qualifiers.map((q) => q.length));
    for (let rank = 0; rank < maxLen; rank++) {
      const rankTeams = qualifiers.map((q) => q[rank]).filter(Boolean) as string[];
      seeded.push(...rankTeams);
    }

    if (seeded.length < 2) return { error: "Nicht genug qualifizierte Teams" };

    const matches = buildKoMatches(tournamentId, seeded);

    const admin = await createAdminClient();
    const { error: insertError } = await admin.from("matches").insert(matches);
    if (insertError) return { error: insertError.message };

    await supabase.from("tournaments").update({ status: "ko_stage" }).eq("id", tournamentId);

    revalidatePath(`/tournaments/${tournamentId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function submitMatchResult(
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

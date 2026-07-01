import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentDetailClient } from "@/components/tournament-detail-client";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const { data: tournamentTeams } = await supabase
    .from("tournament_teams")
    .select("*")
    .eq("tournament_id", id);

  const teamIds = (tournamentTeams ?? []).map((t) => t.team_id);

  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("*").in("id", teamIds)
    : { data: [] };

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", id)
    .order("round")
    .order("match_order");

  let myTeamId: string | null = null;
  if (user) {
    const { data: myTeam } = await supabase
      .from("teams")
      .select("id")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .maybeSingle();
    myTeamId = myTeam?.id ?? null;
  }

  return (
    <TournamentDetailClient
      tournament={tournament}
      tournamentTeams={tournamentTeams ?? []}
      teams={teams ?? []}
      initialMatches={matches ?? []}
      isOrganizer={user?.id === tournament.organizer_id}
      myTeamId={myTeamId}
    />
  );
}

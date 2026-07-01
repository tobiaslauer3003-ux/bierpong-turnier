import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamsClient } from "@/components/teams-client";

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/teams");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, player1_id, player2_id")
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .maybeSingle();

  let player1: { username: string; avatar_color: string } | null = null;
  let player2: { username: string; avatar_color: string } | null = null;
  let sentInvites: { id: string; username: string }[] = [];

  if (team) {
    const ids = [team.player1_id, team.player2_id].filter(Boolean) as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_color")
      .in("id", ids);

    player1 = profiles?.find((p) => p.id === team.player1_id) ?? null;
    player2 = team.player2_id
      ? (profiles?.find((p) => p.id === team.player2_id) ?? null)
      : null;

    if (!team.player2_id) {
      const { data: invites } = await supabase
        .from("team_invites")
        .select("id, invited_user_id")
        .eq("team_id", team.id)
        .eq("status", "pending");

      if (invites && invites.length > 0) {
        const { data: invitedProfiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in(
            "id",
            invites.map((i) => i.invited_user_id),
          );
        sentInvites = invites.map((i) => ({
          id: i.id,
          username:
            invitedProfiles?.find((p) => p.id === i.invited_user_id)?.username ??
            "?",
        }));
      }
    }
  }

  const { data: rawReceivedInvites } = await supabase
    .from("team_invites")
    .select("id, team_id")
    .eq("invited_user_id", user.id)
    .eq("status", "pending");

  let receivedInvites: { id: string; teamId: string; teamName: string }[] = [];
  if (rawReceivedInvites && rawReceivedInvites.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name")
      .in(
        "id",
        rawReceivedInvites.map((i) => i.team_id),
      );
    receivedInvites = rawReceivedInvites.map((i) => ({
      id: i.id,
      teamId: i.team_id,
      teamName: teams?.find((t) => t.id === i.team_id)?.name ?? "Unbekanntes Team",
    }));
  }

  return (
    <TeamsClient
      team={team ?? null}
      player1={player1}
      player2={player2}
      sentInvites={sentInvites}
      receivedInvites={receivedInvites}
    />
  );
}

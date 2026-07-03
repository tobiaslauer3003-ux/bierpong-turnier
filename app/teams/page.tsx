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

  const [{ data: myMemberships }, { data: rawReceivedInvites }] = await Promise.all([
    supabase.from("team_members").select("team_id").eq("user_id", user.id),
    supabase
      .from("team_invites")
      .select("id, team_id")
      .eq("invited_user_id", user.id)
      .eq("status", "pending"),
  ]);

  const myTeamIds = (myMemberships ?? []).map((m) => m.team_id);

  const [{ data: teams }, { data: allMembers }, { data: sentInvitesRaw }, { data: receivedTeams }] =
    await Promise.all([
      myTeamIds.length
        ? supabase.from("teams").select("*").in("id", myTeamIds)
        : Promise.resolve({ data: [] as never[] }),
      myTeamIds.length
        ? supabase.from("team_members").select("team_id, user_id").in("team_id", myTeamIds)
        : Promise.resolve({ data: [] as never[] }),
      myTeamIds.length
        ? supabase
            .from("team_invites")
            .select("id, team_id, invited_user_id")
            .in("team_id", myTeamIds)
            .eq("status", "pending")
        : Promise.resolve({ data: [] as never[] }),
      rawReceivedInvites && rawReceivedInvites.length > 0
        ? supabase
            .from("teams")
            .select("id, name")
            .in(
              "id",
              rawReceivedInvites.map((i) => i.team_id),
            )
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const memberUserIds = Array.from(
    new Set([...(allMembers ?? []).map((m) => m.user_id), ...(sentInvitesRaw ?? []).map((i) => i.invited_user_id)]),
  );

  const { data: profiles } = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_color, avatar_url")
        .in("id", memberUserIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const teamsWithDetails = (teams ?? []).map((team) => ({
    team,
    members: (allMembers ?? [])
      .filter((m) => m.team_id === team.id)
      .map((m) => profileById.get(m.user_id))
      .filter((p): p is NonNullable<typeof p> => !!p),
    sentInvites: (sentInvitesRaw ?? [])
      .filter((i) => i.team_id === team.id)
      .map((i) => ({ id: i.id, username: profileById.get(i.invited_user_id)?.username ?? "?" })),
  }));

  const receivedInvites = (rawReceivedInvites ?? []).map((i) => ({
    id: i.id,
    teamId: i.team_id,
    teamName: receivedTeams?.find((t) => t.id === i.team_id)?.name ?? "Unbekanntes Team",
  }));

  return <TeamsClient myUserId={user.id} teams={teamsWithDetails} receivedInvites={receivedInvites} />;
}

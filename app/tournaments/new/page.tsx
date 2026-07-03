import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTournamentForm } from "@/components/new-tournament-form";

export default async function NewTournamentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tournaments/new");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, max_members")
    .order("name");

  const teamIds = (teams ?? []).map((t) => t.id);
  const { data: members } = teamIds.length
    ? await supabase.from("team_members").select("team_id").in("team_id", teamIds)
    : { data: [] };

  const teamsWithCount = (teams ?? []).map((t) => ({
    ...t,
    memberCount: (members ?? []).filter((m) => m.team_id === t.id).length,
  }));

  return <NewTournamentForm teams={teamsWithCount} />;
}

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
    .select("id, name, player1_id, player2_id")
    .not("player2_id", "is", null)
    .order("name");

  return <NewTournamentForm teams={teams ?? []} />;
}

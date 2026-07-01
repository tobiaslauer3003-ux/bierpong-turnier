import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/avatar";
import { LogoutButton } from "@/components/logout-button";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_color, created_at")
    .eq("id", user.id)
    .single();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, player1_id, player2_id")
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold text-primary">Profil</h1>

      <Card className="flex items-center gap-4">
        <Avatar username={profile.username} color={profile.avatar_color} size="lg" />
        <div>
          <p className="font-heading text-xl font-bold">{profile.username}</p>
          <p className="text-sm text-muted-foreground">Dabei seit {memberSince}</p>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="mb-2 flex items-center gap-2 font-heading font-semibold">
          <UsersThree size={22} className="text-primary" />
          Mein Team
        </div>
        {team ? (
          <p>
            <span className="font-semibold">{team.name}</span>
            {!team.player2_id && (
              <span className="ml-2 text-sm text-muted-foreground">
                (wartet auf zweiten Spieler)
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Du bist noch in keinem Team.
          </p>
        )}
        <Link
          href="/teams"
          className="mt-3 inline-block text-sm font-semibold text-primary"
        >
          Team verwalten →
        </Link>
      </Card>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}

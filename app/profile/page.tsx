import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile-avatar";
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

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, avatar_color, avatar_url, created_at")
      .eq("id", user.id)
      .single(),
    supabase.from("team_members").select("team_id").eq("user_id", user.id),
  ]);

  const teamIds = (memberships ?? []).map((m) => m.team_id);
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] };

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

      <Card>
        <ProfileAvatar
          userId={user.id}
          username={profile.username}
          avatarColor={profile.avatar_color}
          avatarUrl={profile.avatar_url}
        />
        <p className="mt-3 text-sm text-muted-foreground">Dabei seit {memberSince}</p>
      </Card>

      <Card className="mt-4">
        <div className="mb-2 flex items-center gap-2 font-heading font-semibold">
          <UsersThree size={22} className="text-primary" />
          Meine Teams
        </div>
        {teams && teams.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {teams.map((t) => (
              <li key={t.id} className="font-semibold">
                {t.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Du bist noch in keinem Team.
          </p>
        )}
        <Link
          href="/teams"
          className="mt-3 inline-block text-sm font-semibold text-primary"
        >
          Teams verwalten →
        </Link>
      </Card>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}

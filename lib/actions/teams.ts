"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { teamNameSchema } from "@/lib/validation";

export type ActionState = { error?: string; ok?: boolean };

export async function createTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt" };

  const parsed = teamNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültiger Teamname" };
  }

  const rawMax = Number(formData.get("maxMembers"));
  const maxMembers = Number.isFinite(rawMax) && rawMax >= 2 ? Math.min(Math.round(rawMax), 20) : 2;

  const { error } = await supabase.rpc("create_team", {
    p_name: parsed.data,
    p_max_members: maxMembers,
  });

  if (error) {
    return { error: "Team konnte nicht erstellt werden: " + error.message };
  }

  revalidatePath("/teams");
  return { ok: true };
}

export async function inviteToTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt" };

  const teamId = formData.get("teamId") as string;
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  if (!teamId || !username) return { error: "Ungültige Eingabe" };

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (!targetProfile) {
    return { error: "Kein Nutzer mit diesem Benutzernamen gefunden." };
  }

  const { error } = await supabase
    .from("team_invites")
    .insert({ team_id: teamId, invited_user_id: targetProfile.id });

  if (error) {
    let message = "Einladung fehlgeschlagen: " + error.message;
    if (error.message.includes("duplicate")) {
      message = "Dieser Spieler wurde bereits eingeladen.";
    } else if (error.code === "42501" || /row-level security/i.test(error.message)) {
      message = "Einladung nicht möglich — Team ist eventuell schon voll oder der Spieler ist bereits Mitglied.";
    }
    return { error: message };
  }

  revalidatePath("/teams");
  return { ok: true };
}

export async function acceptInvite(inviteId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_team_invite", {
    p_invite_id: inviteId,
  });
  if (error) return { error: error.message };
  revalidatePath("/teams");
  return { ok: true };
}

export async function declineInvite(inviteId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_team_invite", {
    p_invite_id: inviteId,
  });
  if (error) return { error: error.message };
  revalidatePath("/teams");
  return { ok: true };
}

export async function disbandTeam(teamId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("disband_team", {
    p_team_id: teamId,
  });
  if (error) return { error: error.message };
  revalidatePath("/teams");
  return { ok: true };
}

export async function leaveTeam(teamId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_team", {
    p_team_id: teamId,
  });
  if (error) return { error: error.message };
  revalidatePath("/teams");
  return { ok: true };
}

export async function updateAvatarUrl(url: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht eingeloggt" };

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function updateTeamImageUrl(teamId: string, url: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").update({ image_url: url }).eq("id", teamId);
  if (error) return { error: error.message };
  revalidatePath("/teams");
  return { ok: true };
}

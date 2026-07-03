"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Nur für Admins");
  return { supabase, userId: user.id };
}

export async function deleteMember(userId: string): Promise<ActionState> {
  try {
    const { userId: adminId } = await requireAdmin();
    if (userId === adminId) {
      return { error: "Du kannst deinen eigenen Admin-Account nicht löschen." };
    }

    const admin = await createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function createRule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const title = (formData.get("title") as string)?.trim();
    const body = (formData.get("body") as string)?.trim();
    const iconKey = (formData.get("iconKey") as string) || "trophy";
    if (!title || !body) return { error: "Titel und Text sind erforderlich" };

    const { data: maxSort } = await supabase
      .from("rules")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("rules").insert({
      title,
      body,
      icon_key: iconKey,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/rules");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function updateRule(
  ruleId: string,
  data: { title: string; body: string; iconKey: string },
): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("rules")
      .update({ title: data.title, body: data.body, icon_key: data.iconKey })
      .eq("id", ruleId);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/rules");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

export async function deleteRule(ruleId: string): Promise<ActionState> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("rules").delete().eq("id", ruleId);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    revalidatePath("/rules");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fehler" };
  }
}

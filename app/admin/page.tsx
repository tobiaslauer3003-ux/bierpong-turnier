import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminClient } from "@/components/admin-client";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const [{ data: members }, { data: rules }] = await Promise.all([
    supabase.from("member_stats").select("*").order("username"),
    supabase.from("rules").select("*").order("sort_order"),
  ]);

  return <AdminClient myUserId={user.id} members={members ?? []} rules={rules ?? []} />;
}

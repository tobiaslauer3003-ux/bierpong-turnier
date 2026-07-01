import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_color")
    .ilike("username", `%${q}%`)
    .neq("id", user.id)
    .limit(6);

  return NextResponse.json({ results: data ?? [] });
}

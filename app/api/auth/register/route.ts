import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { registerSchema, usernameToEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  const { username, password, accessCode } = parsed.data;

  if (accessCode !== process.env.SIGNUP_ACCESS_CODE) {
    return NextResponse.json({ error: "Ungültiger Zugangscode." }, { status: 403 });
  }

  const email = usernameToEmail(username);
  const admin = await createAdminClient();

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    const message =
      error.status === 422 || /already been registered/i.test(error.message)
        ? "Dieser Benutzername ist bereits vergeben."
        : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

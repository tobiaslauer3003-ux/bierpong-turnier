// Setzt einen Nutzer als Admin. Verwendung:
//   node --env-file=.env.local scripts/seed-admin.mjs <username>            (bestehenden Nutzer befördern)
//   node --env-file=.env.local scripts/seed-admin.mjs <username> <passwort> (neuen Admin-Account anlegen)
import { createClient } from "@supabase/supabase-js";

const [, , username, password] = process.argv;

if (!username) {
  console.error("Verwendung: node --env-file=.env.local scripts/seed-admin.mjs <username> [passwort]");
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  const { data: existing } = await sb
    .from("profiles")
    .select("id, username, role")
    .ilike("username", username)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("profiles").update({ role: "admin" }).eq("id", existing.id);
    if (error) throw error;
    console.log(`"${existing.username}" ist jetzt Admin.`);
    return;
  }

  if (!password) {
    console.error(`Kein Nutzer "${username}" gefunden. Zum Neuanlegen Passwort als zweites Argument angeben.`);
    process.exit(1);
  }

  const email = `${username.trim().toLowerCase()}@bierpong.local`;
  const { data: created, error: createError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (createError) throw createError;

  const { error: roleError } = await sb
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", created.user.id);
  if (roleError) throw roleError;

  console.log(`Neuer Admin-Account "${username}" angelegt.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});

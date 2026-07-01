"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, usernameToEmail } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Registrierung fehlgeschlagen");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(parsed.data.username),
        password: parsed.data.password,
      });
      if (signInError) {
        setError("Konto erstellt, aber Login fehlgeschlagen. Bitte manuell einloggen.");
        router.push("/login");
        return;
      }

      router.push("/profile");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 font-heading text-3xl font-bold text-primary">
        Registrieren
      </h1>
      <p className="mb-6 text-muted-foreground">
        Leg deinen Account für das Bierpong-Turnier an.
      </p>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium">
              Benutzername
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Wird erstellt…" : "Konto erstellen"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Schon registriert?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Jetzt einloggen
        </Link>
      </p>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Check, X, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { teamNameSchema } from "@/lib/validation";
import {
  createTeam,
  inviteToTeam,
  acceptInvite,
  declineInvite,
  disbandTeam,
} from "@/lib/actions/teams";

type Player = { username: string; avatar_color: string } | null;
type SearchResult = { id: string; username: string; avatar_color: string };

export function TeamsClient({
  team,
  player1,
  player2,
  sentInvites,
  receivedInvites,
}: {
  team: { id: string; name: string; player1_id: string; player2_id: string | null } | null;
  player1: Player;
  player2: Player;
  sentInvites: { id: string; username: string }[];
  receivedInvites: { id: string; teamId: string; teamName: string }[];
}) {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold text-primary">Teams</h1>

      {receivedInvites.length > 0 && (
        <Card className="mb-4 border-secondary">
          <div className="mb-2 flex items-center gap-2 font-heading font-semibold">
            <EnvelopeSimple size={22} className="text-secondary" />
            Einladungen für dich
          </div>
          <ul className="flex flex-col gap-2">
            {receivedInvites.map((invite) => (
              <InviteRow key={invite.id} invite={invite} onDone={() => router.refresh()} />
            ))}
          </ul>
        </Card>
      )}

      {team ? (
        <TeamCard
          team={team}
          player1={player1}
          player2={player2}
          sentInvites={sentInvites}
          onDone={() => router.refresh()}
        />
      ) : (
        <CreateTeamCard onDone={() => router.refresh()} />
      )}
    </main>
  );
}

function InviteRow({
  invite,
  onDone,
}: {
  invite: { id: string; teamName: string };
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: (id: string) => Promise<{ error?: string }>) {
    setPending(true);
    setError(null);
    const res = await action(invite.id);
    setPending(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <li className="rounded-xl bg-surface-raised px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          Team <span className="font-semibold">{invite.teamName}</span> lädt dich ein
        </span>
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => respond(acceptInvite)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-success text-success-foreground cursor-pointer disabled:opacity-50"
            aria-label="Annehmen"
          >
            <Check size={18} weight="bold" />
          </button>
          <button
            disabled={pending}
            onClick={() => respond(declineInvite)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive text-destructive-foreground cursor-pointer disabled:opacity-50"
            aria-label="Ablehnen"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </li>
  );
}

function CreateTeamCard({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = teamNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ungültiger Name");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("name", parsed.data);
    const res = await createTeam({}, formData);
    setPending(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <Card>
      <h2 className="mb-3 font-heading text-lg font-semibold">Team gründen</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Die Becherhelden"
          className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Wird erstellt…" : "Team gründen"}
        </Button>
      </form>
    </Card>
  );
}

function TeamCard({
  team,
  player1,
  player2,
  sentInvites,
  onDone,
}: {
  team: { id: string; name: string };
  player1: Player;
  player2: Player;
  sentInvites: { id: string; username: string }[];
  onDone: () => void;
}) {
  const [disbanding, setDisbanding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisband() {
    if (!confirm(`"${team.name}" wirklich auflösen? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setDisbanding(true);
    setError(null);
    const res = await disbandTeam(team.id);
    setDisbanding(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <Card>
      <h2 className="mb-3 font-heading text-xl font-bold">{team.name}</h2>
      <div className="flex flex-col gap-3">
        {player1 && (
          <div className="flex items-center gap-3">
            <Avatar username={player1.username} color={player1.avatar_color} size="sm" />
            <span>{player1.username}</span>
          </div>
        )}
        {player2 ? (
          <div className="flex items-center gap-3">
            <Avatar username={player2.username} color={player2.avatar_color} size="sm" />
            <span>{player2.username}</span>
          </div>
        ) : (
          <>
            <InviteSearch teamId={team.id} sentInvites={sentInvites} onDone={onDone} />
            <div className="border-t border-border pt-3">
              <button
                onClick={handleDisband}
                disabled={disbanding}
                className="text-sm text-destructive underline-offset-2 hover:underline cursor-pointer disabled:opacity-50"
              >
                {disbanding ? "Wird aufgelöst…" : "Team auflösen"}
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                Nur möglich, solange noch kein zweiter Spieler dabei ist — z.B. um
                stattdessen eine andere Einladung anzunehmen.
              </p>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function InviteSearch({
  teamId,
  sentInvites,
  onDone,
}: {
  teamId: string;
  sentInvites: { id: string; username: string }[];
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      setResults(json.results ?? []);
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  async function invite(username: string) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("teamId", teamId);
    formData.set("username", username);
    const res = await inviteToTeam({}, formData);
    setPending(false);
    if (res.error) setError(res.error);
    else {
      setQuery("");
      setResults([]);
      onDone();
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        Noch ein Platz frei — such nach deinem Partner:
      </p>
      <div className="relative">
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Benutzername suchen…"
          className="h-11 w-full rounded-xl border-2 border-border bg-background pl-10 pr-4 text-base outline-none focus:border-primary"
        />
      </div>

      {results.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.id}>
              <button
                disabled={pending}
                onClick={() => invite(r.username)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-raised cursor-pointer disabled:opacity-50"
              >
                <Avatar username={r.username} color={r.avatar_color} size="sm" />
                <span>{r.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {sentInvites.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Ausstehende Einladungen
          </p>
          <ul className="flex flex-wrap gap-2">
            {sentInvites.map((invite) => (
              <li
                key={invite.id}
                className="rounded-full bg-surface-raised px-3 py-1 text-sm"
              >
                {invite.username}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

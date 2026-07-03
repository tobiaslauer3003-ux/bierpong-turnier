"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  Check,
  X,
  EnvelopeSimple,
  UsersThree,
  Crown,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { ImageUploadButton } from "@/components/image-upload-button";
import { teamNameSchema } from "@/lib/validation";
import { colorFromString } from "@/lib/palette";
import type { Team } from "@/lib/database.types";
import {
  createTeam,
  inviteToTeam,
  acceptInvite,
  declineInvite,
  disbandTeam,
  leaveTeam,
  updateTeamImageUrl,
} from "@/lib/actions/teams";

type Member = { id: string; username: string; avatar_color: string; avatar_url: string | null };
type SearchResult = { id: string; username: string; avatar_color: string };
type TeamWithDetails = {
  team: Team;
  members: Member[];
  sentInvites: { id: string; username: string }[];
};

export function TeamsClient({
  myUserId,
  teams,
  receivedInvites,
}: {
  myUserId: string;
  teams: TeamWithDetails[];
  receivedInvites: { id: string; teamId: string; teamName: string }[];
}) {
  const router = useRouter();
  const onDone = () => router.refresh();

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
              <InviteRow key={invite.id} invite={invite} onDone={onDone} />
            ))}
          </ul>
        </Card>
      )}

      {teams.length > 0 && (
        <div className="mb-4 flex flex-col gap-4">
          {teams.map(({ team, members, sentInvites }) => (
            <TeamCard
              key={team.id}
              team={team}
              members={members}
              sentInvites={sentInvites}
              myUserId={myUserId}
              onDone={onDone}
            />
          ))}
        </div>
      )}

      <CreateTeamCard onDone={onDone} />
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
  const [maxMembers, setMaxMembers] = useState("2");
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
    formData.set("maxMembers", maxMembers);
    const res = await createTeam({}, formData);
    setPending(false);
    if (res.error) setError(res.error);
    else {
      setName("");
      onDone();
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-heading text-lg font-semibold">Neues Team gründen</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Die Becherhelden"
          className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
          required
        />
        <div>
          <label htmlFor="maxMembers" className="mb-1 block text-sm font-medium">
            Maximale Teamgröße
          </label>
          <input
            id="maxMembers"
            type="number"
            inputMode="numeric"
            min={2}
            max={20}
            value={maxMembers}
            onChange={(e) => setMaxMembers(e.target.value)}
            className="h-12 w-24 rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
          />
        </div>
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
  members,
  sentInvites,
  myUserId,
  onDone,
}: {
  team: Team;
  members: Member[];
  sentInvites: { id: string; username: string }[];
  myUserId: string;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCreator = team.created_by === myUserId;
  const isFull = members.length >= team.max_members;

  async function handleLeave() {
    if (!confirm(`"${team.name}" wirklich verlassen?`)) return;
    setPending(true);
    setError(null);
    const res = await leaveTeam(team.id);
    setPending(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  async function handleDisband() {
    if (!confirm(`"${team.name}" wirklich komplett auflösen? Das kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await disbandTeam(team.id);
    setPending(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-3">
        <div className="relative">
          <Avatar
            username={team.name}
            color={colorFromString(team.name)}
            imageUrl={team.image_url}
            size="lg"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-xl font-bold">{team.name}</h2>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <UsersThree size={16} />
            {members.length} / {team.max_members} Mitglieder
          </p>
        </div>
      </div>

      <ImageUploadButton
        bucket="team-images"
        path={`${team.id}/image.jpg`}
        label="Team-Bild ändern"
        onUploaded={async (url) => {
          await updateTeamImageUrl(team.id, url);
          onDone();
        }}
        className="mb-3"
      />

      <ul className="mb-3 flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar username={m.username} color={m.avatar_color} imageUrl={m.avatar_url} size="sm" />
            <span className="flex-1 text-sm">{m.username}</span>
            {team.created_by === m.id && (
              <Crown size={16} weight="fill" className="text-primary" aria-label="Gründer" />
            )}
          </li>
        ))}
      </ul>

      {!isFull && <InviteSearch teamId={team.id} sentInvites={sentInvites} onDone={onDone} />}

      <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3">
        <button
          onClick={handleLeave}
          disabled={pending}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline cursor-pointer disabled:opacity-50"
        >
          Team verlassen
        </button>
        {isCreator && (
          <button
            onClick={handleDisband}
            disabled={pending}
            className="text-sm text-destructive underline-offset-2 hover:underline cursor-pointer disabled:opacity-50"
          >
            Team auflösen
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
      <p className="mb-2 text-sm text-muted-foreground">Weiteres Mitglied einladen:</p>
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

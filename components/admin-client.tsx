"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash, PencilSimple, Plus, UsersThree, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { RuleIcon, RULE_ICON_OPTIONS } from "@/components/rule-icon";
import { deleteMember, createRule, updateRule, deleteRule } from "@/lib/actions/admin";
import type { MemberStats, Rule } from "@/lib/database.types";

export function AdminClient({
  myUserId,
  members,
  rules,
}: {
  myUserId: string;
  members: MemberStats[];
  rules: Rule[];
}) {
  const router = useRouter();
  const onDone = () => router.refresh();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 flex items-center gap-2 font-heading text-3xl font-bold text-primary">
        <ShieldCheck size={30} weight="fill" />
        Admin
      </h1>
      <p className="mb-6 text-muted-foreground">Mitgliederverwaltung und Regel-Pflege.</p>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-bold">
          <UsersThree size={22} />
          Mitglieder ({members.length})
        </h2>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} isSelf={m.id === myUserId} onDone={onDone} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold">Bierpong-Regeln</h2>
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} onDone={onDone} />
          ))}
        </div>
        <NewRuleCard onDone={onDone} />
      </section>
    </main>
  );
}

function MemberRow({
  member,
  isSelf,
  onDone,
}: {
  member: MemberStats;
  isSelf: boolean;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`"${member.username}" wirklich entfernen? Account und alle Daten werden gelöscht.`)) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await deleteMember(member.id);
    setPending(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  return (
    <Card className="flex items-center gap-3 py-2">
      <Avatar
        username={member.username}
        color={member.avatar_color}
        imageUrl={member.avatar_url}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.username}
          {member.role === "admin" && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Admin
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{member.team_count} Team(s)</p>
      </div>
      {!isSelf && (
        <button
          onClick={handleDelete}
          disabled={pending}
          aria-label="Mitglied entfernen"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
        >
          <Trash size={20} />
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </Card>
  );
}

function RuleRow({ rule, onDone }: { rule: Rule; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rule.title);
  const [body, setBody] = useState(rule.body);
  const [iconKey, setIconKey] = useState(rule.icon_key);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    const res = await updateRule(rule.id, { title, body, iconKey });
    setPending(false);
    if (res.error) setError(res.error);
    else {
      setEditing(false);
      onDone();
    }
  }

  async function handleDelete() {
    if (!confirm(`Regel "${rule.title}" wirklich löschen?`)) return;
    setPending(true);
    setError(null);
    const res = await deleteRule(rule.id);
    setPending(false);
    if (res.error) setError(res.error);
    else onDone();
  }

  if (editing) {
    return (
      <Card>
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-xl border-2 border-border bg-background px-3 outline-none focus:border-primary"
            placeholder="Titel"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="rounded-xl border-2 border-border bg-background px-3 py-2 outline-none focus:border-primary"
            placeholder="Text"
          />
          <IconPicker value={iconKey} onChange={setIconKey} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={pending}>
              Speichern
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <RuleIcon iconKey={rule.icon_key} size={22} weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold">{rule.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{rule.body}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={() => setEditing(true)}
          aria-label="Bearbeiten"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-raised cursor-pointer"
        >
          <PencilSimple size={18} />
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          aria-label="Löschen"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
        >
          <Trash size={18} />
        </button>
      </div>
    </Card>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RULE_ICON_OPTIONS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-label={key}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 cursor-pointer ${
            value === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          <RuleIcon iconKey={key} size={20} />
        </button>
      ))}
    </div>
  );
}

function NewRuleCard({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [iconKey, setIconKey] = useState<string>("trophy");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("iconKey", iconKey);
    const res = await createRule({}, formData);
    setPending(false);
    if (res.error) setError(res.error);
    else {
      setOpen(false);
      onDone();
    }
  }

  if (!open) {
    return (
      <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>
        <Plus size={18} />
        Neue Regel
      </Button>
    );
  }

  return (
    <Card className="mt-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          name="title"
          required
          placeholder="Titel"
          className="h-11 rounded-xl border-2 border-border bg-background px-3 outline-none focus:border-primary"
        />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Text"
          className="rounded-xl border-2 border-border bg-background px-3 py-2 outline-none focus:border-primary"
        />
        <IconPicker value={iconKey} onChange={setIconKey} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Wird erstellt…" : "Regel anlegen"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  );
}

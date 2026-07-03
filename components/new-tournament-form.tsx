"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createTournament, type ActionState } from "@/lib/actions/tournaments";

type Team = { id: string; name: string; max_members: number; memberCount: number };

const initialState: ActionState = {};

export function NewTournamentForm({ teams }: { teams: Team[] }) {
  const [state, formAction, pending] = useActionState(createTournament, initialState);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold text-primary">
        Turnier anlegen
      </h1>

      <Card>
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Turniername
            </label>
            <input
              id="name"
              name="name"
              className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
              placeholder="z.B. Sommerfest Cup 2026"
              required
            />
          </div>

          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium">
              Datum
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className="h-12 w-full rounded-xl border-2 border-border bg-background px-4 text-base outline-none focus:border-primary"
              required
            />
          </div>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium">Modus</legend>
            <div className="flex gap-3">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="radio" name="mode" value="ko" defaultChecked className="accent-primary" />
                K.o.-System
              </label>
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="radio" name="mode" value="gruppenphase" className="accent-primary" />
                Gruppenphase
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium">
              Teilnehmende Teams ({teams.length} verfügbar)
            </legend>
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Es gibt noch keine Teams. Erst unter „Teams" welche gründen.
              </p>
            ) : (
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-xl border-2 border-border p-2">
                {teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-raised has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="checkbox"
                      name="teamIds"
                      value={team.id}
                      className="h-5 w-5 accent-primary"
                    />
                    <span className="flex-1">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.memberCount}/{team.max_members}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {state.error && (
            <div
              role="alert"
              className="rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={pending || teams.length < 2}>
            {pending ? "Wird erstellt…" : "Turnier erstellen"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

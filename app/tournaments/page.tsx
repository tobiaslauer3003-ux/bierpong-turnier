import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Trophy, Plus, CalendarBlank } from "@phosphor-icons/react/dist/ssr";

const statusLabel: Record<string, string> = {
  draft: "Geplant",
  group_stage: "Gruppenphase läuft",
  ko_stage: "K.o.-Runde läuft",
  finished: "Abgeschlossen",
};

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, date, mode, status")
    .order("date", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-primary">Turniere</h1>
        <ButtonLink href="/tournaments/new" size="sm">
          <Plus size={18} weight="bold" />
          Neu
        </ButtonLink>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <Card className="text-center text-muted-foreground">
          Noch keine Turniere angelegt.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link href={`/tournaments/${t.id}`}>
                <Card className="transition-transform duration-150 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy size={24} className="text-primary" />
                      <div>
                        <p className="font-heading font-semibold">{t.name}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarBlank size={14} />
                          {new Date(t.date).toLocaleDateString("de-DE")}
                          {" · "}
                          {t.mode === "ko" ? "K.o." : "Gruppenphase"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold">
                      {statusLabel[t.status] ?? t.status}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

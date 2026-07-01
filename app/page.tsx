import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, UsersThree, BookOpenText, Sparkle } from "@phosphor-icons/react/dist/ssr";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-14 text-center">
      <span className="mb-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
        <Sparkle size={16} weight="fill" />
        Jugend Thomas Morus
      </span>
      <h1 className="mb-4 font-heading text-4xl font-bold leading-tight sm:text-5xl">
        Der <span className="text-primary">Bierpong Cup</span>
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Teams gründen, Turnierbaum verfolgen und Ergebnisse live eintragen —
        alles direkt vom Handy aus, während die Party läuft.
      </p>

      <div className="mb-10 flex flex-col gap-3 sm:flex-row">
        {user ? (
          <ButtonLink href="/tournaments" size="lg">
            <Trophy size={20} />
            Zu den Turnieren
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href="/register" size="lg">
              Jetzt mitmachen
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="outline">
              Login
            </ButtonLink>
          </>
        )}
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        <Card>
          <UsersThree size={26} className="mx-auto mb-2 text-primary" />
          <p className="font-heading font-semibold">Teams</p>
          <p className="mt-1 text-sm text-muted-foreground">
            2er-Teams gründen und Partner einladen
          </p>
        </Card>
        <Card>
          <Trophy size={26} className="mx-auto mb-2 text-primary" />
          <p className="font-heading font-semibold">Turnierbaum</p>
          <p className="mt-1 text-sm text-muted-foreground">
            K.o. oder Gruppenphase — live für alle
          </p>
        </Card>
        <Card>
          <BookOpenText size={26} className="mx-auto mb-2 text-primary" />
          <p className="font-heading font-semibold">Regeln</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Offizielle Bierpong-Regeln immer griffbereit
          </p>
        </Card>
      </div>
    </main>
  );
}

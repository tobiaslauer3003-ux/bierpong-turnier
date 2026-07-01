import { Card } from "@/components/ui/card";
import {
  Target,
  ArrowsClockwise,
  Eye,
  ArrowUUpLeft,
  HandPalm,
  Balloon,
  Trophy,
  ListNumbers,
} from "@phosphor-icons/react/dist/ssr";

const sections = [
  {
    icon: Target,
    title: "Aufbau",
    text: "Jedes Team stellt 10 Becher als Dreieck auf der eigenen Tischseite auf (Spitze zeigt zum Gegner). Die Becher werden zu gleichen Teilen mit Bier gefüllt. Der Tisch ist üblicherweise 2,4 m lang.",
  },
  {
    icon: ListNumbers,
    title: "Spielablauf",
    text: "Abwechselnd wirft je ein Spieler eines Teams einen Tischtennisball in Richtung der gegnerischen Becher. Landet der Ball in einem Becher, trinkt das gegnerische Team ihn aus und entfernt ihn vom Tisch. Treffen beide Spieler eines Teams direkt hintereinander, gibt es meist einen Bonus-Wurf (\"Kreativ\"-Regel, optional).",
  },
  {
    icon: ArrowsClockwise,
    title: "Re-Rack",
    text: "Jedes Team darf während des Spiels die verbleibenden Becher ein- bis zweimal neu in eine engere Formation ordnen lassen (z.B. Dreieck, Raute, Linie), um sie leichter zu treffen.",
  },
  {
    icon: ArrowUUpLeft,
    title: "Redemption / Rebuttal",
    text: "Trifft ein Team den letzten Becher des Gegners, bekommt das unterlegene Team noch einen letzten Durchgang (beide Spieler werfen weiter), um auszugleichen — bis es selbst daneben wirft.",
  },
  {
    icon: Eye,
    title: "Eye Rule",
    text: "Ein Ball, der den Tischrand berührt hat, bevor er in einen Becher fällt, zählt nur, wenn kein gegnerischer Spieler \"Eye Rule\" ruft, bevor der Ball den Becher berührt.",
  },
  {
    icon: HandPalm,
    title: "Elbow Rule",
    text: "Beim Wurf darf der Arm die Tischkante nicht überragen (Ellbogen bleibt hinter der Tischkante). Bei Verstoß zählt der Treffer nicht.",
  },
  {
    icon: Balloon,
    title: "Anpusten / Abwehren",
    text: "Ein rotierender Ball, der bereits einen Becherrand berührt hat und sich noch dreht, darf vom verteidigenden Team weggepustet oder mit der Hand abgewehrt werden.",
  },
  {
    icon: Trophy,
    title: "Sieg",
    text: "Ein Team gewinnt, wenn alle Becher des Gegners getroffen und geleert wurden (nach eventueller Redemption-Runde). Bei Turnieren gilt: bei Gleichstand entscheidet ein Sudden-Death-Wurf pro Team.",
  },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-heading text-3xl font-bold text-primary">
        Bierpong-Regeln
      </h1>
      <p className="mb-6 text-muted-foreground">
        Die klassischen US-Bierpong-Regeln als Referenz während des Turniers.
        Der Organisator kann vor dem Turnier Hausregeln absprechen.
      </p>

      <div className="flex flex-col gap-4">
        {sections.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

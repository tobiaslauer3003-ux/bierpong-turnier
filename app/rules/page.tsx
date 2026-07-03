import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { RuleIcon } from "@/components/rule-icon";

export default async function RulesPage() {
  const supabase = await createClient();
  const { data: rules } = await supabase.from("rules").select("*").order("sort_order");

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
        {(rules ?? []).map((rule) => (
          <Card key={rule.id} className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RuleIcon iconKey={rule.icon_key} size={24} weight="duotone" />
            </div>
            <div>
              <h2 className="font-heading font-semibold">{rule.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{rule.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}

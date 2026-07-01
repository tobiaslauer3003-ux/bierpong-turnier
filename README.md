# Bierpong Cup — Jugend Thomas Morus

Web-App (PWA) zur Organisation von Bierpong-Turnieren: Accounts, 2er-Teams,
automatischer Turnierbaum (K.o. oder Gruppenphase + Playoffs), Live-Ergebnisse
per Supabase Realtime, Regel-Referenz und Rangliste.

**Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Supabase
(Postgres, Auth, Realtime) + Vercel Hosting.

## 1. Voraussetzungen

- Node.js ≥ 20
- Ein Supabase-Projekt (bereits vorhanden: `twmqisrmzuwmzvuisqtl`)
- Ein Vercel-Account für das Deployment

## 2. Lokale Einrichtung

```bash
npm install
```

`.env.local` (bereits vorhanden, **niemals committen** — steht in `.gitignore`):

```
NEXT_PUBLIC_SUPABASE_URL=https://twmqisrmzuwmzvuisqtl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>
SUPABASE_SERVICE_ROLE_KEY=<secret key — nur serverseitig verwendet>
```

⚠️ `SUPABASE_SERVICE_ROLE_KEY` hat vollen Admin-Zugriff und **darf nie** mit
`NEXT_PUBLIC_` präfixiert oder im Client-Code verwendet werden.

## 3. Datenbank-Schema einrichten (einmalig, Pflicht!)

Das Schema wurde **noch nicht** gegen das Supabase-Projekt ausgeführt. Ohne
diesen Schritt schlagen Registrierung, Teams und Turniere fehl (Fehler
`relation "public.profiles" does not exist`).

1. Supabase Dashboard öffnen → **SQL Editor** → **New query**
2. Inhalt von [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   komplett hineinkopieren
3. **Run** klicken

Das Skript legt an: Tabellen (`profiles`, `teams`, `team_invites`,
`tournaments`, `tournament_teams`, `matches`), einen Trigger, der bei jeder
Registrierung automatisch ein Profil anlegt, alle Row-Level-Security-Policies,
die RPC-Funktionen (`accept_team_invite`, `decline_team_invite`,
`submit_match_result`) sowie zwei Statistik-Views und die Realtime-Publikation
für `matches`/`team_invites`. Das Skript ist idempotent (`IF NOT EXISTS` /
`CREATE OR REPLACE`) und kann bei Bedarf erneut ausgeführt werden.

Danach im Dev-Server testen:

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

## 4. Auth-Funktionsweise (kurz)

Registrierung läuft ohne Pflicht-E-Mail: Aus dem Benutzernamen wird intern
eine feste Fake-Adresse `username@bierpong.local` erzeugt (siehe
`lib/validation.ts`). Ein Server-Route-Handler
(`app/api/auth/register/route.ts`) legt den Nutzer über die Supabase-Admin-API
mit bereits bestätigter E-Mail an — es ist also **keine** Änderung an den
Supabase-Auth-Einstellungen (z. B. „Confirm email“) nötig.

## 5. Deployment (Netlify + Supabase)

Das Projekt ist für Netlify vorbereitet: `netlify.toml` + `@netlify/plugin-nextjs`
sind bereits enthalten und übernehmen automatisch SSR, Route Handler und den
Next.js „Proxy“ (Session-Refresh/Route-Schutz).

1. **Repo zu GitHub pushen** (lokales Git-Repo existiert bereits, Commit ist
   drin):
   ```bash
   git remote add origin https://github.com/<dein-user>/<dein-repo>.git
   git branch -M main
   git push -u origin main
   ```
   (Repo vorher leer auf [github.com/new](https://github.com/new) anlegen,
   ohne README/.gitignore — sonst gibt es einen Merge-Konflikt beim Push.)
2. Auf [app.netlify.com](https://app.netlify.com) → **Add new site** →
   **Import an existing project** → GitHub-Repo auswählen
3. Netlify erkennt Next.js automatisch (Build-Command/Publish-Verzeichnis
   kommen aus `netlify.toml`) — nichts anpassen nötig
4. Unter **Site configuration → Environment variables** dieselben drei
   Variablen wie in `.env.local` eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (als *sensitive* markieren)
5. **Deploy site** klicken
6. Supabase-Projekt bleibt unverändert bestehen (Schema wurde bereits im
   SQL Editor eingerichtet, siehe Schritt 3)

Danach ist die App unter der Netlify-URL erreichbar und lässt sich auf dem
Handy über „Zum Startbildschirm hinzufügen“ als PWA installieren
(Icon/Manifest/Service Worker sind bereits eingerichtet, siehe
`public/manifest.json` und `public/sw.js`). Jeder weitere `git push` auf
`main` deployt danach automatisch neu.

## 6. Realtime testen

Zwei Browserfenster (oder ein Fenster + Handy) nebeneinander auf dieselbe
Turnierseite (`/tournaments/[id]`) öffnen. Ergebnis in einem Fenster
eintragen → der Turnierbaum/die Gruppentabelle im anderen Fenster aktualisiert
sich automatisch (Supabase Realtime auf der `matches`-Tabelle), inklusive
automatischem Weiterrücken des Gewinner-Teams im K.o.-Baum.

## 7. Projektstruktur

```
app/                    Next.js App Router Seiten
  (auth)/register, login
  api/auth/register      Route Handler (service_role Nutzer-Anlage)
  api/users/search        Username-Suche für Team-Einladungen
  profile/, teams/, tournaments/, rules/, leaderboard/
components/              UI-Komponenten (Cards, Buttons, Bracket, Avatar, ...)
lib/
  supabase/              Client/Server/Proxy-Helper (@supabase/ssr)
  actions/                Server Actions (Teams, Turniere, Ergebnisse)
  bracket.ts              K.o.- und Gruppenphase-Algorithmus
  database.types.ts       Handgeschriebene Supabase-Typen
  validation.ts            zod-Schemas, Username→Fake-E-Mail
supabase/migrations/     SQL-Schema (0001_init.sql)
public/                  Manifest, Icons, Service Worker
proxy.ts                 Next 16 „Proxy“ (ehem. Middleware) für Session-Refresh
```

## 8. Bekannte Scope-Entscheidungen

- Ein Nutzer ist zeitgleich in maximal einem aktiven Team
- Profilbild = Initialen + Zufallsfarbe (kein Datei-Upload)
- Ein bereits eingetragenes Match-Ergebnis kann nicht mehr über die App
  korrigiert werden (nötigenfalls direkt in der Supabase-Tabelle anpassen)
- „Organisator“ ist keine globale Rolle, sondern schlicht der Ersteller eines
  Turniers

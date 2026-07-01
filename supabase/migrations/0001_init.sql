-- Bierpong-Turnier "Jugend Thomas Morus" — Initiales Schema
-- Einmalig im Supabase SQL Editor ausführen (Project Settings -> SQL Editor -> New query).
-- Sicher erneut ausführbar dank IF NOT EXISTS / CREATE OR REPLACE, außer bei den CREATE TABLE-Blöcken.

create extension if not exists pgcrypto;

-- =========================================================
-- TABELLEN
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_color text not null default '#F59E0B',
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  player1_id uuid not null references public.profiles (id) on delete cascade,
  player2_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_players_distinct check (player1_id <> player2_id)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create unique index if not exists team_invites_pending_unique
  on public.team_invites (team_id, invited_user_id)
  where status = 'pending';

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  mode text not null check (mode in ('ko', 'gruppenphase')),
  status text not null default 'draft' check (status in ('draft', 'group_stage', 'ko_stage', 'finished')),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  teams_per_group_advance int not null default 2,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_teams (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  group_name text,
  primary key (tournament_id, team_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  stage text not null check (stage in ('group', 'ko')),
  round int not null,
  match_order int not null,
  group_name text,
  team_a_id uuid references public.teams (id) on delete set null,
  team_b_id uuid references public.teams (id) on delete set null,
  score_a int,
  score_b int,
  winner_id uuid references public.teams (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists matches_tournament_idx on public.matches (tournament_id);
create index if not exists team_invites_invited_user_idx on public.team_invites (invited_user_id);

-- =========================================================
-- TRIGGER: profiles automatisch bei neuem auth.users-Eintrag anlegen
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  palette text[] := array['#F59E0B', '#FBBF24', '#DC2626', '#22C55E', '#2563EB', '#D946EF', '#0EA5E9', '#F97316'];
begin
  insert into public.profiles (id, username, avatar_color)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    palette[1 + floor(random() * array_length(palette, 1))::int]
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- TRIGGER: teams.player1_id/player2_id nur über RPC-Funktionen änderbar
-- =========================================================

create or replace function public.protect_team_membership()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_team_lock', true), '') <> 'on' then
    if new.player1_id is distinct from old.player1_id
       or new.player2_id is distinct from old.player2_id then
      raise exception 'Team-Mitgliedschaft kann nur über die Einladungsfunktionen geändert werden';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists teams_protect_membership on public.teams;
create trigger teams_protect_membership
  before update on public.teams
  for each row execute function public.protect_team_membership();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_invites enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.matches enable row level security;

-- profiles
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- teams
drop policy if exists "teams_select_all" on public.teams;
create policy "teams_select_all" on public.teams
  for select to authenticated using (true);

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own" on public.teams
  for insert to authenticated
  with check (
    auth.uid() = player1_id
    and not exists (
      select 1 from public.teams t
      where t.player1_id = auth.uid() or t.player2_id = auth.uid()
    )
  );

drop policy if exists "teams_update_members" on public.teams;
create policy "teams_update_members" on public.teams
  for update to authenticated
  using (auth.uid() = player1_id or auth.uid() = player2_id)
  with check (auth.uid() = player1_id or auth.uid() = player2_id);

-- team_invites
drop policy if exists "team_invites_select_involved" on public.team_invites;
create policy "team_invites_select_involved" on public.team_invites
  for select to authenticated
  using (
    invited_user_id = auth.uid()
    or exists (
      select 1 from public.teams t
      where t.id = team_id and (t.player1_id = auth.uid() or t.player2_id = auth.uid())
    )
  );

drop policy if exists "team_invites_insert_by_member" on public.team_invites;
create policy "team_invites_insert_by_member" on public.team_invites
  for insert to authenticated
  with check (
    invited_user_id <> auth.uid()
    and exists (
      select 1 from public.teams t
      where t.id = team_id
        and (t.player1_id = auth.uid() or t.player2_id = auth.uid())
        and t.player2_id is null
    )
  );

-- tournaments
drop policy if exists "tournaments_select_all" on public.tournaments;
create policy "tournaments_select_all" on public.tournaments
  for select to authenticated using (true);

drop policy if exists "tournaments_insert_own" on public.tournaments;
create policy "tournaments_insert_own" on public.tournaments
  for insert to authenticated
  with check (auth.uid() = organizer_id);

drop policy if exists "tournaments_update_organizer" on public.tournaments;
create policy "tournaments_update_organizer" on public.tournaments
  for update to authenticated
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

-- tournament_teams
drop policy if exists "tournament_teams_select_all" on public.tournament_teams;
create policy "tournament_teams_select_all" on public.tournament_teams
  for select to authenticated using (true);

drop policy if exists "tournament_teams_all_organizer" on public.tournament_teams;
create policy "tournament_teams_all_organizer" on public.tournament_teams
  for all to authenticated
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.organizer_id = auth.uid()))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id and t.organizer_id = auth.uid()));

-- matches: nur lesend für Clients, alle Schreibzugriffe laufen über SECURITY DEFINER RPCs / Server Actions
drop policy if exists "matches_select_all" on public.matches;
create policy "matches_select_all" on public.matches
  for select to authenticated using (true);

-- =========================================================
-- RPC: Team-Einladungen annehmen / ablehnen
-- =========================================================

create or replace function public.accept_team_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_team record;
begin
  select * into v_invite from public.team_invites where id = p_invite_id for update;
  if v_invite is null then
    raise exception 'Einladung nicht gefunden';
  end if;
  if v_invite.invited_user_id <> auth.uid() then
    raise exception 'Nicht berechtigt';
  end if;
  if v_invite.status <> 'pending' then
    raise exception 'Einladung ist nicht mehr offen';
  end if;

  select * into v_team from public.teams where id = v_invite.team_id for update;
  if v_team.player2_id is not null then
    raise exception 'Team ist bereits voll';
  end if;

  if exists (
    select 1 from public.teams
    where player1_id = auth.uid() or player2_id = auth.uid()
  ) then
    raise exception 'Du bist bereits Mitglied eines Teams';
  end if;

  perform set_config('app.bypass_team_lock', 'on', true);
  update public.teams set player2_id = auth.uid() where id = v_team.id;

  update public.team_invites set status = 'accepted' where id = p_invite_id;

  update public.team_invites
    set status = 'declined'
    where invited_user_id = auth.uid() and status = 'pending' and id <> p_invite_id;
end;
$$;

create or replace function public.decline_team_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team_invites
    set status = 'declined'
    where id = p_invite_id and invited_user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Einladung nicht gefunden oder nicht berechtigt';
  end if;
end;
$$;

grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.decline_team_invite(uuid) to authenticated;

-- =========================================================
-- RPC: Match-Ergebnis eintragen + automatisches Advancement im K.o.-Baum
-- =========================================================

create or replace function public.submit_match_result(p_match_id uuid, p_score_a int, p_score_b int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_tournament record;
  v_is_participant boolean;
  v_winner uuid;
  v_next_round int;
  v_next_order int;
  v_next_match record;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if v_match is null then
    raise exception 'Match nicht gefunden';
  end if;
  if v_match.status = 'done' then
    raise exception 'Ergebnis wurde bereits eingetragen';
  end if;
  if v_match.team_a_id is null or v_match.team_b_id is null then
    raise exception 'Match ist noch nicht vollständig besetzt';
  end if;
  if p_score_a = p_score_b then
    raise exception 'Unentschieden ist nicht möglich';
  end if;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id;

  select exists (
    select 1 from public.teams
    where id in (v_match.team_a_id, v_match.team_b_id)
      and (player1_id = auth.uid() or player2_id = auth.uid())
  ) into v_is_participant;

  if not (v_is_participant or v_tournament.organizer_id = auth.uid()) then
    raise exception 'Nicht berechtigt, dieses Ergebnis einzutragen';
  end if;

  v_winner := case when p_score_a > p_score_b then v_match.team_a_id else v_match.team_b_id end;

  update public.matches
    set score_a = p_score_a, score_b = p_score_b, winner_id = v_winner, status = 'done'
    where id = p_match_id;

  if v_match.stage = 'ko' then
    v_next_round := v_match.round + 1;
    v_next_order := v_match.match_order / 2;

    select * into v_next_match
      from public.matches
      where tournament_id = v_match.tournament_id
        and stage = 'ko'
        and round = v_next_round
        and match_order = v_next_order
      for update;

    if v_next_match is not null then
      if v_match.match_order % 2 = 0 then
        update public.matches set team_a_id = v_winner,
          status = case when team_b_id is not null then 'ready' else 'pending' end
          where id = v_next_match.id;
      else
        update public.matches set team_b_id = v_winner,
          status = case when team_a_id is not null then 'ready' else 'pending' end
          where id = v_next_match.id;
      end if;
    else
      update public.tournaments set status = 'finished' where id = v_match.tournament_id and status <> 'finished';
    end if;
  end if;
end;
$$;

grant execute on function public.submit_match_result(uuid, int, int) to authenticated;

-- =========================================================
-- VIEWS: Statistiken
-- =========================================================

create or replace view public.team_match_stats
with (security_invoker = true) as
select
  m.tournament_id,
  m.stage,
  t.id as team_id,
  count(*) filter (where m.status = 'done') as played,
  count(*) filter (where m.status = 'done' and m.winner_id = t.id) as wins,
  count(*) filter (where m.status = 'done' and m.winner_id is not null and m.winner_id <> t.id) as losses,
  coalesce(sum(case when m.team_a_id = t.id then m.score_a when m.team_b_id = t.id then m.score_b end)
    filter (where m.status = 'done'), 0) as cups_for,
  coalesce(sum(case when m.team_a_id = t.id then m.score_b when m.team_b_id = t.id then m.score_a end)
    filter (where m.status = 'done'), 0) as cups_against
from public.matches m
join public.teams t on t.id in (m.team_a_id, m.team_b_id)
group by m.tournament_id, m.stage, t.id;

create or replace view public.team_overall_stats
with (security_invoker = true) as
select
  t.id as team_id,
  count(*) filter (where m.status = 'done') as played,
  count(*) filter (where m.status = 'done' and m.winner_id = t.id) as wins,
  count(*) filter (where m.status = 'done' and m.winner_id is not null and m.winner_id <> t.id) as losses,
  coalesce(sum(case when m.team_a_id = t.id then m.score_a when m.team_b_id = t.id then m.score_b end)
    filter (where m.status = 'done'), 0) as cups_for,
  coalesce(sum(case when m.team_a_id = t.id then m.score_b when m.team_b_id = t.id then m.score_a end)
    filter (where m.status = 'done'), 0) as cups_against
from public.teams t
left join public.matches m on t.id in (m.team_a_id, m.team_b_id)
group by t.id;

-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_invites'
  ) then
    alter publication supabase_realtime add table public.team_invites;
  end if;
end $$;

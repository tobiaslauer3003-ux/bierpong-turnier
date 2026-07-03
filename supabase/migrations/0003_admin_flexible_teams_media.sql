-- Erweiterung: Admin-Rolle, flexible Teamgröße, Mehrfach-Team-Mitgliedschaft,
-- Profil-/Team-Bilder, DB-gestützte Regeln.
-- Einmalig im Supabase SQL Editor ausführen (nach 0001_init.sql und 0002_disband_team.sql).

-- =========================================================
-- PROFILES: role, avatar_url
-- =========================================================

alter table public.profiles add column if not exists role text not null default 'member'
  check (role in ('member', 'admin'));
alter table public.profiles add column if not exists avatar_url text;

-- =========================================================
-- TEAMS: created_by, max_members, image_url (ersetzt player1_id/player2_id)
-- =========================================================

alter table public.teams add column if not exists created_by uuid references public.profiles (id) on delete set null;
update public.teams set created_by = player1_id where created_by is null;

alter table public.teams add column if not exists max_members int not null default 2
  check (max_members between 2 and 20);
alter table public.teams add column if not exists image_url text;

-- =========================================================
-- NEU: team_members (many-to-many statt player1_id/player2_id)
-- =========================================================

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

insert into public.team_members (team_id, user_id, joined_at)
select id, player1_id, created_at from public.teams
where player1_id is not null
on conflict do nothing;

insert into public.team_members (team_id, user_id, joined_at)
select id, player2_id, created_at from public.teams
where player2_id is not null
on conflict do nothing;

-- alter Schutz-Mechanismus entfällt: Mitgliedschaft läuft jetzt ausschließlich
-- über RPCs, da team_members keine Client-Schreib-Policy hat
drop trigger if exists teams_protect_membership on public.teams;
drop function if exists public.protect_team_membership();

-- alte Policies aus 0001 hängen noch an player1_id/player2_id — müssen vor
-- dem Drop der Spalten weg (werden weiter unten durch die neuen ersetzt)
drop policy if exists "teams_insert_own" on public.teams;
drop policy if exists "teams_update_members" on public.teams;
drop policy if exists "team_invites_select_involved" on public.team_invites;
drop policy if exists "team_invites_insert_by_member" on public.team_invites;

alter table public.teams drop column if exists player1_id;
alter table public.teams drop column if exists player2_id;

create index if not exists team_members_user_idx on public.team_members (user_id);

-- =========================================================
-- NEU: rules (ersetzt statischen Text auf /rules)
-- =========================================================

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  icon_key text not null default 'trophy',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.rules (title, body, icon_key, sort_order)
select * from (values
  ('Aufbau', 'Jedes Team stellt 10 Becher als Dreieck auf der eigenen Tischseite auf (Spitze zeigt zum Gegner). Die Becher werden zu gleichen Teilen mit Bier gefüllt. Der Tisch ist üblicherweise 2,4 m lang.', 'target', 0),
  ('Spielablauf', 'Abwechselnd wirft je ein Spieler eines Teams einen Tischtennisball in Richtung der gegnerischen Becher. Landet der Ball in einem Becher, trinkt das gegnerische Team ihn aus und entfernt ihn vom Tisch. Treffen beide Spieler eines Teams direkt hintereinander, gibt es meist einen Bonus-Wurf ("Kreativ"-Regel, optional).', 'list-numbers', 1),
  ('Re-Rack', 'Jedes Team darf während des Spiels die verbleibenden Becher ein- bis zweimal neu in eine engere Formation ordnen lassen (z.B. Dreieck, Raute, Linie), um sie leichter zu treffen.', 'arrows-clockwise', 2),
  ('Redemption / Rebuttal', 'Trifft ein Team den letzten Becher des Gegners, bekommt das unterlegene Team noch einen letzten Durchgang (beide Spieler werfen weiter), um auszugleichen — bis es selbst daneben wirft.', 'arrow-u-up-left', 3),
  ('Eye Rule', 'Ein Ball, der den Tischrand berührt hat, bevor er in einen Becher fällt, zählt nur, wenn kein gegnerischer Spieler "Eye Rule" ruft, bevor der Ball den Becher berührt.', 'eye', 4),
  ('Elbow Rule', 'Beim Wurf darf der Arm die Tischkante nicht überragen (Ellbogen bleibt hinter der Tischkante). Bei Verstoß zählt der Treffer nicht.', 'hand-palm', 5),
  ('Anpusten / Abwehren', 'Ein rotierender Ball, der bereits einen Becherrand berührt hat und sich noch dreht, darf vom verteidigenden Team weggepustet oder mit der Hand abgewehrt werden.', 'balloon', 6),
  ('Sieg', 'Ein Team gewinnt, wenn alle Becher des Gegners getroffen und geleert wurden (nach eventueller Redemption-Runde). Bei Turnieren gilt: bei Gleichstand entscheidet ein Sudden-Death-Wurf pro Team.', 'trophy', 7)
) as seed(title, body, icon_key, sort_order)
where not exists (select 1 from public.rules);

-- =========================================================
-- TOURNAMENTS: organizer_id darf beim Löschen des Nutzers nicht mehr
-- das ganze Turnier mitreißen
-- =========================================================

alter table public.tournaments alter column organizer_id drop not null;
alter table public.tournaments drop constraint if exists tournaments_organizer_id_fkey;
alter table public.tournaments
  add constraint tournaments_organizer_id_fkey
  foreign key (organizer_id) references public.profiles (id) on delete set null;

-- =========================================================
-- VIEW: Mitgliederstatistik fürs Admin-Panel
-- =========================================================

create or replace view public.member_stats
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.avatar_url,
  p.avatar_color,
  p.role,
  p.created_at,
  count(tm.team_id) as team_count
from public.profiles p
left join public.team_members tm on tm.user_id = p.id
group by p.id;

-- =========================================================
-- RLS: profiles / teams / team_members / team_invites / rules
-- =========================================================

alter table public.team_members enable row level security;
alter table public.rules enable row level security;

drop policy if exists "team_members_select_all" on public.team_members;
create policy "team_members_select_all" on public.team_members
  for select to authenticated using (true);
-- bewusst keine INSERT/UPDATE/DELETE-Policy: Mitgliedschaft ändert sich
-- ausschließlich über SECURITY DEFINER RPCs

drop policy if exists "teams_insert_own" on public.teams;
create policy "teams_insert_own" on public.teams
  for insert to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "teams_update_members" on public.teams;
create policy "teams_update_members" on public.teams
  for update to authenticated
  using (exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid()))
  with check (exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid()));

drop policy if exists "team_invites_select_involved" on public.team_invites;
create policy "team_invites_select_involved" on public.team_invites
  for select to authenticated
  using (
    invited_user_id = auth.uid()
    or exists (select 1 from public.team_members tm where tm.team_id = team_id and tm.user_id = auth.uid())
  );

drop policy if exists "team_invites_insert_by_member" on public.team_invites;
create policy "team_invites_insert_by_member" on public.team_invites
  for insert to authenticated
  with check (
    invited_user_id <> auth.uid()
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = team_id and tm.user_id = auth.uid()
    )
    and (select count(*) from public.team_members tm2 where tm2.team_id = team_id)
        < (select t.max_members from public.teams t where t.id = team_id)
    and not exists (
      select 1 from public.team_members tm3
      where tm3.team_id = team_id and tm3.user_id = invited_user_id
    )
  );

drop policy if exists "rules_select_all" on public.rules;
create policy "rules_select_all" on public.rules
  for select to authenticated using (true);

drop policy if exists "rules_admin_write" on public.rules;
create policy "rules_admin_write" on public.rules
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =========================================================
-- RPC: accept_team_invite (Kapazität statt Zwei-Slot-Logik)
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
  v_member_count int;
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

  select count(*) into v_member_count from public.team_members where team_id = v_team.id;
  if v_member_count >= v_team.max_members then
    raise exception 'Team ist bereits voll';
  end if;

  if exists (select 1 from public.team_members where team_id = v_team.id and user_id = auth.uid()) then
    raise exception 'Du bist bereits Mitglied dieses Teams';
  end if;

  insert into public.team_members (team_id, user_id) values (v_team.id, auth.uid());

  update public.team_invites set status = 'accepted' where id = p_invite_id;
end;
$$;

-- =========================================================
-- RPC: leave_team (Mitglied verlässt Team selbst)
-- =========================================================

create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  if not exists (select 1 from public.team_members where team_id = p_team_id and user_id = auth.uid()) then
    raise exception 'Du bist kein Mitglied dieses Teams';
  end if;

  if exists (select 1 from public.tournament_teams where team_id = p_team_id) then
    raise exception 'Team nimmt bereits an einem Turnier teil und kann nicht mehr verlassen werden';
  end if;

  delete from public.team_members where team_id = p_team_id and user_id = auth.uid();

  select count(*) into v_remaining from public.team_members where team_id = p_team_id;
  if v_remaining = 0 then
    delete from public.teams where id = p_team_id;
  end if;
end;
$$;

-- =========================================================
-- RPC: disband_team (jetzt an created_by statt Mitgliederzahl geknüpft)
-- =========================================================

create or replace function public.disband_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team record;
begin
  select * into v_team from public.teams where id = p_team_id for update;
  if v_team is null then
    raise exception 'Team nicht gefunden';
  end if;
  if v_team.created_by <> auth.uid() then
    raise exception 'Nicht berechtigt';
  end if;
  if exists (select 1 from public.tournament_teams where team_id = p_team_id) then
    raise exception 'Team nimmt bereits an einem Turnier teil und kann nicht aufgelöst werden';
  end if;

  delete from public.teams where id = p_team_id;
end;
$$;

grant execute on function public.accept_team_invite(uuid) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.disband_team(uuid) to authenticated;

-- =========================================================
-- RPC: submit_match_result (Teilnehmer-Check über team_members)
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
    select 1 from public.team_members
    where team_id in (v_match.team_a_id, v_match.team_b_id)
      and user_id = auth.uid()
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
-- VIEWS neu erzeugen (referenzieren teams, das sich strukturell geändert hat)
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
-- STORAGE: Buckets + Policies für Avatare und Team-Bilder
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-images', 'team-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_own_write" on storage.objects;
create policy "avatars_own_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists "team_images_public_read" on storage.objects;
create policy "team_images_public_read" on storage.objects
  for select using (bucket_id = 'team-images');

drop policy if exists "team_images_member_write" on storage.objects;
create policy "team_images_member_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'team-images'
    and exists (
      select 1 from public.team_members tm
      where tm.team_id::text = (storage.foldername(name))[1] and tm.user_id = auth.uid()
    )
  );

drop policy if exists "team_images_member_update" on storage.objects;
create policy "team_images_member_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'team-images'
    and (
      exists (
        select 1 from public.team_members tm
        where tm.team_id::text = (storage.foldername(name))[1] and tm.user_id = auth.uid()
      )
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists "team_images_delete" on storage.objects;
create policy "team_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'team-images'
    and (
      exists (
        select 1 from public.team_members tm
        where tm.team_id::text = (storage.foldername(name))[1] and tm.user_id = auth.uid()
      )
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

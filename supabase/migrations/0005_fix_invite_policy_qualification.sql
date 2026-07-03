-- Bugfix: In team_invites_insert_by_member wurden Spaltenverweise in den
-- Unterabfragen nicht auf team_invites qualifiziert. Da team_members selbst
-- eine Spalte team_id hat, band Postgres das unqualifizierte "team_id"
-- fälschlich an die innere Unterabfrage (tm.team_id = tm.team_id, immer wahr)
-- statt an die neue team_invites-Zeile. Das hebelte sowohl die
-- Kapazitätsprüfung als auch die "schon Mitglied"-Prüfung aus.
-- Einmalig im Supabase SQL Editor ausführen (nach 0004_create_team_rpc.sql).

drop policy if exists "team_invites_insert_by_member" on public.team_invites;
create policy "team_invites_insert_by_member" on public.team_invites
  for insert to authenticated
  with check (
    invited_user_id <> auth.uid()
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = team_invites.team_id and tm.user_id = auth.uid()
    )
    and (select count(*) from public.team_members tm2 where tm2.team_id = team_invites.team_id)
        < (select t.max_members from public.teams t where t.id = team_invites.team_id)
    and not exists (
      select 1 from public.team_members tm3
      where tm3.team_id = team_invites.team_id and tm3.user_id = team_invites.invited_user_id
    )
  );

drop policy if exists "team_invites_select_involved" on public.team_invites;
create policy "team_invites_select_involved" on public.team_invites
  for select to authenticated
  using (
    invited_user_id = auth.uid()
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = team_invites.team_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "teams_update_members" on public.teams;
create policy "teams_update_members" on public.teams
  for update to authenticated
  using (exists (select 1 from public.team_members tm where tm.team_id = teams.id and tm.user_id = auth.uid()))
  with check (exists (select 1 from public.team_members tm where tm.team_id = teams.id and tm.user_id = auth.uid()));

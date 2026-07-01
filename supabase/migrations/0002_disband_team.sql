-- Nachtrag: erlaubt dem Team-Gründer, ein noch unvollständiges Team (kein
-- zweiter Spieler) wieder aufzulösen, z.B. um stattdessen eine andere
-- Einladung anzunehmen. Einmalig im Supabase SQL Editor ausführen.

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
  if v_team.player1_id <> auth.uid() then
    raise exception 'Nicht berechtigt';
  end if;
  if v_team.player2_id is not null then
    raise exception 'Team hat bereits zwei Spieler und kann nicht mehr aufgelöst werden';
  end if;
  if exists (select 1 from public.tournament_teams where team_id = p_team_id) then
    raise exception 'Team nimmt bereits an einem Turnier teil und kann nicht aufgelöst werden';
  end if;

  delete from public.teams where id = p_team_id;
end;
$$;

grant execute on function public.disband_team(uuid) to authenticated;

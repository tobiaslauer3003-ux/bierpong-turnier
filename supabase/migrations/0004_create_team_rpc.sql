-- Bugfix: Team-Erstellung inkl. Gründungsmitgliedschaft muss atomar über eine
-- RPC laufen, da team_members bewusst keine Client-INSERT-Policy hat.
-- Einmalig im Supabase SQL Editor ausführen (nach 0003_admin_flexible_teams_media.sql).

create or replace function public.create_team(p_name text, p_max_members int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if p_max_members < 2 or p_max_members > 20 then
    raise exception 'Teamgröße muss zwischen 2 und 20 liegen';
  end if;
  if length(trim(p_name)) < 2 then
    raise exception 'Teamname zu kurz';
  end if;

  insert into public.teams (name, created_by, max_members)
  values (trim(p_name), auth.uid(), p_max_members)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id) values (v_team_id, auth.uid());

  return v_team_id;
end;
$$;

grant execute on function public.create_team(text, int) to authenticated;

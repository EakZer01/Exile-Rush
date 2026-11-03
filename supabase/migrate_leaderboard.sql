-- Exile Survivors — build 54: Leaderboard & Weekly migration
-- Paste into Supabase → SQL Editor → Run (once). Safe to run again.
-- Adds the columns the in-game Leaderboard reads: weekly key, optional display
-- name, Endgame Echo depth; plus the indexes those queries filter on.

alter table public.runs
  add column if not exists weekly int     not null default 0,
  add column if not exists name   text,
  add column if not exists echoes int     not null default 0;

-- keep values inside what the game can send
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'runs_name_len') then
    alter table public.runs add constraint runs_name_len check (name is null or char_length(name) <= 20);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'runs_echoes_range') then
    alter table public.runs add constraint runs_echoes_range check (echoes between 0 and 1000);
  end if;
end $$;

create index if not exists runs_daily_idx on public.runs (daily);
create index if not exists runs_weekly_idx on public.runs (weekly);
create index if not exists runs_echoes_idx on public.runs (echoes);

-- make the API see the new columns right away
notify pgrst, 'reload schema';

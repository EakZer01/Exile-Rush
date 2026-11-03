-- Exile Survivors — run statistics
-- Paste this whole file into Supabase → SQL Editor → Run. Safe to run again.
-- Players can only ADD runs and READ them; nobody can edit or delete through the public key.

create table if not exists public.runs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  build       int  not null check (build between 1 and 100000),
  player      text not null check (char_length(player) between 6 and 40),   -- random id per browser, not a name
  cls         text not null check (char_length(cls) <= 20),
  asc_class   text          check (char_length(asc_class) <= 30),
  result      text not null check (result in ('win', 'dead', 'endgame')),
  time_s      int  not null check (time_s between 0 and 20000),
  level       int  not null check (level between 1 and 200),
  tier        int  not null check (tier between 1 and 20),
  heat        int  not null default 0 check (heat between 0 and 100),
  hc          boolean not null default false,
  daily       boolean not null default false,
  kills       int  not null default 0 check (kills between 0 and 10000000),
  bosses      int  not null default 0 check (bosses between 0 and 100),
  killer      text          check (char_length(killer) <= 80),
  main_skill  text          check (char_length(main_skill) <= 40),
  weapon      text          check (char_length(weapon) <= 20),
  skills      jsonb not null default '[]'::jsonb,   -- [{id, lv, evo, sup: [...], dmg}]
  keystones   jsonb not null default '[]'::jsonb,
  masteries   jsonb not null default '[]'::jsonb,
  check (pg_column_size(skills) + pg_column_size(keystones) + pg_column_size(masteries) < 8000)
);

create index if not exists runs_build_idx on public.runs (build);
create index if not exists runs_main_skill_idx on public.runs (main_skill);

alter table public.runs enable row level security;

drop policy if exists "anyone can add a run" on public.runs;
create policy "anyone can add a run" on public.runs
  for insert to anon, authenticated with check (true);

drop policy if exists "anyone can read runs" on public.runs;
create policy "anyone can read runs" on public.runs
  for select to anon, authenticated using (true);

-- the public key may add and read, nothing else (explicit, for projects that don't auto-expose new tables)
grant usage on schema public to anon, authenticated;
grant select, insert on public.runs to anon, authenticated;
revoke update, delete, truncate on public.runs from anon, authenticated;

-- make the API see the new table right away
notify pgrst, 'reload schema';

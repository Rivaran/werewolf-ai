create table if not exists public.werewolf_game_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.werewolf_discussion_messages (
  id text primary key,
  game_id text not null,
  player_number integer not null,
  character_id text not null,
  message text not null,
  day integer not null,
  timestamp timestamptz not null default now(),
  started_at timestamptz not null default now()
);

create index if not exists werewolf_discussion_game_timestamp_idx
  on public.werewolf_discussion_messages (game_id, timestamp);

create index if not exists werewolf_discussion_started_at_idx
  on public.werewolf_discussion_messages (started_at desc);


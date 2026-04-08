-- LIVE PLAYER SCORES
create table public.live_player_scores (
  match_id uuid references public.matches(id) on delete cascade not null,
  player_id uuid references public.players(id) on delete cascade not null,
  points numeric not null default 0,
  primary key (match_id, player_id)
);
alter table public.live_player_scores enable row level security;
create policy "Live scores are viewable by everyone." on live_player_scores for select using (true);

-- LIVE USER MATCH RANKS
create table public.live_user_match_ranks (
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  raw_score numeric not null default 0,
  relative_rank integer not null,
  primary key (user_id, match_id)
);
alter table public.live_user_match_ranks enable row level security;
create policy "Live ranks are viewable by everyone." on live_user_match_ranks for select using (true);

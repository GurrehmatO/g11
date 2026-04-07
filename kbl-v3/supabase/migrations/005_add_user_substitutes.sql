-- USER SUBSTITUTES
create table public.user_substitutes (
  id uuid default uuid_generate_v4() primary key,
  user_team_id uuid references public.user_teams(id) on delete cascade not null,
  player_id uuid references public.players(id) not null,
  priority integer not null check (priority between 1 and 4),
  unique(user_team_id, player_id),
  unique(user_team_id, priority)
);

alter table public.user_substitutes enable row level security;
create policy "Users can view all substitutes." on user_substitutes for select using (true);
create policy "Users can insert their own substitutes." on user_substitutes for insert with check (
  exists (select 1 from user_teams where id = user_team_id and user_id = auth.uid())
);
create policy "Users can update their own substitutes." on user_substitutes for update using (
  exists (select 1 from user_teams where id = user_team_id and user_id = auth.uid())
);
create policy "Users can delete their own substitutes." on user_substitutes for delete using (
  exists (select 1 from user_teams where id = user_team_id and user_id = auth.uid())
);

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  total_points numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- TRIGGER for creating profile on auth user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- MATCHES
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  api_match_id text unique not null,
  name text not null,
  match_date timestamp with time zone not null,
  status text not null default 'upcoming', -- upcoming, live, completed
  team_a text not null,
  team_b text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.matches enable row level security;
create policy "Matches are viewable by everyone." on matches for select using (true);

-- PLAYERS
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  api_player_id text unique not null,
  name text not null,
  role text not null, -- batsman, bowler, allrounder, wk
  team text not null,
  credits numeric not null default 9.0
);
alter table public.players enable row level security;
create policy "Players are viewable by everyone." on players for select using (true);

-- USER TEAMS
create table public.user_teams (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  captain_id uuid references public.players(id) not null,
  vice_captain_id uuid references public.players(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, match_id)
);
alter table public.user_teams enable row level security;
create policy "Users can view all teams." on user_teams for select using (true);
create policy "Users can create their own team." on user_teams for insert with check (auth.uid() = user_id);
create policy "Users can update their own team." on user_teams for update using (auth.uid() = user_id);

-- USER TEAM PLAYERS (The 11 selected)
create table public.user_team_players (
  user_team_id uuid references public.user_teams(id) on delete cascade not null,
  player_id uuid references public.players(id) on delete cascade not null,
  primary key (user_team_id, player_id)
);
alter table public.user_team_players enable row level security;
create policy "User team players viewable by everyone." on user_team_players for select using (true);
-- To keep it simple, team inserts are handled via backend RPC or matching auth logic.
create policy "Users can modify their own team players." on user_team_players for all using (
  exists (select 1 from user_teams where id = user_team_id and user_id = auth.uid())
);

-- MATCH PLAYER SCORES (Populated from API after match)
create table public.player_scores (
  match_id uuid references public.matches(id) on delete cascade not null,
  player_id uuid references public.players(id) on delete cascade not null,
  points numeric not null default 0,
  primary key (match_id, player_id)
);
alter table public.player_scores enable row level security;
create policy "Scores are viewable by everyone." on player_scores for select using (true);

-- USER MATCH RANKS (The calculated relative ranking)
create table public.user_match_ranks (
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id uuid references public.matches(id) on delete cascade not null,
  raw_score numeric not null default 0,
  relative_rank integer not null,
  relative_points numeric not null,
  primary key (user_id, match_id)
);
alter table public.user_match_ranks enable row level security;
create policy "Ranks are viewable by everyone." on user_match_ranks for select using (true);

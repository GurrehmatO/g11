-- Create user_global_rank_history table
-- Stores each user's global leaderboard rank after every completed match,
-- even if they didn't play that match.
CREATE TABLE IF NOT EXISTS public.user_global_rank_history (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  global_rank integer NOT NULL,
  PRIMARY KEY (user_id, match_id)
);

ALTER TABLE public.user_global_rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global rank history viewable by everyone"
  ON public.user_global_rank_history FOR SELECT USING (true);

-- Drop the old global_rank column from user_match_ranks
ALTER TABLE public.user_match_ranks DROP COLUMN IF EXISTS global_rank;

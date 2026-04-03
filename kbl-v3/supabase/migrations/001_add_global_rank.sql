-- Add global_rank column to user_match_ranks
ALTER TABLE public.user_match_ranks 
ADD COLUMN IF NOT EXISTS global_rank integer;

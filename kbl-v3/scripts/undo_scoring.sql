-- Undo scoring for: Rajasthan Royals vs Mumbai Indians, 13th Match
-- Run this in Supabase SQL Editor

-- Find the match first
DO $$
DECLARE
  v_match_id uuid;
  v_total_points_to_subtract numeric;
BEGIN
  -- Get the match ID
  SELECT id INTO v_match_id
  FROM matches 
  WHERE team_a = 'Rajasthan Royals' AND team_b = 'Mumbai Indians'
  LIMIT 1;

  RAISE NOTICE 'Match ID: %', v_match_id;

  -- Get total points earned in this match
  SELECT SUM(relative_points) INTO v_total_points_to_subtract
  FROM user_match_ranks 
  WHERE match_id = v_match_id;

  RAISE NOTICE 'Total points to subtract: %', v_total_points_to_subtract;

  -- Step 1: Subtract points from each user's profile
  UPDATE profiles p
  SET total_points = COALESCE(total_points, 0) - COALESCE(
    (SELECT SUM(relative_points) FROM user_match_ranks WHERE user_id = p.id AND match_id = v_match_id),
    0
  )
  WHERE EXISTS (SELECT 1 FROM user_match_ranks WHERE user_id = p.id AND match_id = v_match_id);

  RAISE NOTICE 'Profiles updated';

  -- Step 2: Delete player scores
  DELETE FROM player_scores WHERE match_id = v_match_id;
  RAISE NOTICE 'Player scores deleted';

  -- Step 3: Delete user match ranks
  DELETE FROM user_match_ranks WHERE match_id = v_match_id;
  RAISE NOTICE 'User match ranks deleted';

  -- Step 4: Delete global rank history
  DELETE FROM user_global_rank_history WHERE match_id = v_match_id;
  RAISE NOTICE 'Global rank history deleted';

  -- Verify
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  Player scores remaining: %', (SELECT COUNT(*) FROM player_scores WHERE match_id = v_match_id);
  RAISE NOTICE '  User match ranks remaining: %', (SELECT COUNT(*) FROM user_match_ranks WHERE match_id = v_match_id);
  RAISE NOTICE '  Global rank history remaining: %', (SELECT COUNT(*) FROM user_global_rank_history WHERE match_id = v_match_id);
END $$;
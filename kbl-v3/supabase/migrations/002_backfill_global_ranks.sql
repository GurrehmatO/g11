-- Backfill global_rank for all completed matches
-- Run this in Supabase SQL Editor after adding the global_rank column

DO $$
DECLARE
  match_rec RECORD;
  rank_rec RECORD;
  cumulative_points JSONB := '{}';
  uid TEXT;
  current_cumulative NUMERIC;
  sorted_users JSONB;
  rank_idx INTEGER;
  user_uuid UUID;
BEGIN
  FOR match_rec IN 
    SELECT m.id, m.match_date
    FROM matches m
    WHERE m.status = 'completed'
    ORDER BY m.match_date ASC
  LOOP
    RAISE NOTICE 'Processing match: %', match_rec.id;

    FOR rank_rec IN 
      SELECT umr.user_id, umr.relative_points
      FROM user_match_ranks umr
      WHERE umr.match_id = match_rec.id
    LOOP
      uid := rank_rec.user_id::TEXT;
      current_cumulative := COALESCE((cumulative_points ->> uid)::NUMERIC, 0);
      cumulative_points := jsonb_set(
        cumulative_points,
        ARRAY[uid],
        to_jsonb(current_cumulative + rank_rec.relative_points)
      );
    END LOOP;

    sorted_users := (
      SELECT jsonb_agg(key ORDER BY value DESC)
      FROM jsonb_each(cumulative_points)
    );

    rank_idx := 0;
    FOR user_uuid IN SELECT jsonb_array_elements_text(sorted_users)::UUID
    LOOP
      rank_idx := rank_idx + 1;
      UPDATE user_match_ranks umr
      SET global_rank = rank_idx
      WHERE umr.user_id = user_uuid
        AND umr.match_id = match_rec.id;
    END LOOP;

    RAISE NOTICE '  Updated % users', rank_idx;
  END LOOP;

  RAISE NOTICE 'Backfill complete.';
END $$;

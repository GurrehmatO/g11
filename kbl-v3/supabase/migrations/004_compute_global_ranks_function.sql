-- Function to compute global leaderboard ranks for all users after each completed match.
-- For every completed match (chronological), accumulates each user's relative_points
-- and assigns a global_rank. Users who didn't play a match still get a rank entry
-- (their cumulative points don't change, so their rank may shift).
CREATE OR REPLACE FUNCTION public.compute_global_ranks()
RETURNS void AS $$
DECLARE
  match_rec RECORD;
  rank_rec RECORD;
  profile_rec RECORD;
  cumulative_points JSONB := '{}';
  uid TEXT;
  current_cumulative NUMERIC;
  sorted_users JSONB;
  rank_idx INTEGER;
  user_uuid UUID;
BEGIN
  DELETE FROM public.user_global_rank_history;

  FOR match_rec IN
    SELECT m.id, m.match_date
    FROM matches m
    WHERE m.status = 'completed'
    ORDER BY m.match_date ASC
  LOOP
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

    FOR profile_rec IN SELECT id FROM profiles LOOP
      uid := profile_rec.id::TEXT;
      IF NOT (cumulative_points ? uid) THEN
        cumulative_points := jsonb_set(cumulative_points, ARRAY[uid], '0'::jsonb);
      END IF;
    END LOOP;

    sorted_users := (
      SELECT jsonb_agg(key ORDER BY value DESC)
      FROM jsonb_each(cumulative_points)
    );

    rank_idx := 0;
    FOR user_uuid IN SELECT jsonb_array_elements_text(sorted_users)::UUID LOOP
      rank_idx := rank_idx + 1;
      INSERT INTO public.user_global_rank_history (user_id, match_id, global_rank)
      VALUES (user_uuid, match_rec.id, rank_idx)
      ON CONFLICT (user_id, match_id) DO UPDATE SET global_rank = EXCLUDED.global_rank;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

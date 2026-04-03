-- Backfill global ranks by calling the compute function
-- Run this in Supabase SQL Editor after running migrations 003 and 004
SELECT public.compute_global_ranks();

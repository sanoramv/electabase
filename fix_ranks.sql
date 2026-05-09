-- fix_ranks.sql
-- Assigns rank_national to all corruption_scores records.
-- Run in Supabase SQL Editor.

-- Step 1: Rank politicians with score > 0 (highest score = rank 1)
UPDATE corruption_scores cs
SET rank_national = ranked.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, id ASC) as rn
  FROM corruption_scores
  WHERE score > 0
) ranked
WHERE cs.id = ranked.id;

-- Step 2: Assign remaining rank to all score = 0 politicians
UPDATE corruption_scores
SET rank_national = (SELECT COUNT(*) FROM corruption_scores WHERE score > 0) + 1
WHERE score = 0;

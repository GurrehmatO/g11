-- Add abandoned flag to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS abandoned BOOLEAN DEFAULT FALSE NOT NULL;

-- Add profit_withdrawal to entry_type enum
ALTER TYPE public.entry_type ADD VALUE IF NOT EXISTS 'profit_withdrawal';

-- Add prep_time column to recipes for labor cost calculation
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS prep_time_minutes integer DEFAULT 0;
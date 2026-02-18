
-- Add stock tracking columns to ingredients
ALTER TABLE public.ingredients
ADD COLUMN current_stock numeric NOT NULL DEFAULT 0,
ADD COLUMN minimum_stock numeric NOT NULL DEFAULT 0;

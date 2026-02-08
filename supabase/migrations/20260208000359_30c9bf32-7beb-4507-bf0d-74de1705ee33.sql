
-- Add pricing configuration columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS minute_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixed_costs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS salary_goal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS work_hours_per_day numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS work_days_per_month numeric DEFAULT 22,
ADD COLUMN IF NOT EXISTS variable_cost_rate numeric DEFAULT 10;

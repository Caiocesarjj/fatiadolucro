
-- Add Asaas payment columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_cycle text DEFAULT 'MONTHLY';

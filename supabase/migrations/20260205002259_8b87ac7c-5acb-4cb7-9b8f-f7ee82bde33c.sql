-- Add plan_type to profiles table for subscription management
ALTER TABLE public.profiles
ADD COLUMN plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro'));

-- Add invoice_number to transactions table
ALTER TABLE public.transactions
ADD COLUMN invoice_number text;

-- Add category and photo_url to recipes for catalog feature
ALTER TABLE public.recipes
ADD COLUMN category text,
ADD COLUMN photo_url text;

-- Create index for faster plan lookups
CREATE INDEX idx_profiles_plan_type ON public.profiles(plan_type);

-- Create index for invoice lookups
CREATE INDEX idx_transactions_invoice_number ON public.transactions(invoice_number);
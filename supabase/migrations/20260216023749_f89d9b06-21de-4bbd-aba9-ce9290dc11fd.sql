
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mp_manage_subscription_url TEXT;

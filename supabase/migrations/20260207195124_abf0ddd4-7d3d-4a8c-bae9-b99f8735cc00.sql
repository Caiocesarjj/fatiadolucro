
-- Create coupon_type enum
CREATE TYPE public.coupon_type AS ENUM ('percentage', 'vip_access');

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type public.coupon_type NOT NULL DEFAULT 'percentage',
  value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Only admins can manage coupons
CREATE POLICY "Admins can view all coupons" ON public.coupons FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert coupons" ON public.coupons FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update coupons" ON public.coupons FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete coupons" ON public.coupons FOR DELETE USING (public.is_admin());


-- Create app_config table for storing global app credentials (Mercado Pago, etc.)
CREATE TABLE public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_public_key text,
  mp_access_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view app_config"
ON public.app_config FOR SELECT
USING (public.is_admin());

-- Only admins can update
CREATE POLICY "Admins can update app_config"
ON public.app_config FOR UPDATE
USING (public.is_admin());

-- Only admins can insert
CREATE POLICY "Admins can insert app_config"
ON public.app_config FOR INSERT
WITH CHECK (public.is_admin());

-- Insert default row
INSERT INTO public.app_config (mp_public_key, mp_access_token) VALUES (NULL, NULL);

-- Trigger for updated_at
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

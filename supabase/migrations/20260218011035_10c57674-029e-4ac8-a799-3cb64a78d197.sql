
-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own logs"
ON public.activity_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert their own logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.activity_logs FOR SELECT
USING (is_admin());

-- Admins can delete logs
CREATE POLICY "Admins can delete logs"
ON public.activity_logs FOR DELETE
USING (is_admin());

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '7 days';
$$;

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',
  'SELECT public.cleanup_old_logs()'
);


-- Ensure RLS is enabled
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they exist
DROP POLICY IF EXISTS "Users can view their own platforms" ON public.platforms;
DROP POLICY IF EXISTS "Users can insert their own platforms" ON public.platforms;
DROP POLICY IF EXISTS "Users can update their own platforms" ON public.platforms;
DROP POLICY IF EXISTS "Users can delete their own platforms" ON public.platforms;

CREATE POLICY "Users can view their own platforms" ON public.platforms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own platforms" ON public.platforms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own platforms" ON public.platforms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own platforms" ON public.platforms FOR DELETE USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

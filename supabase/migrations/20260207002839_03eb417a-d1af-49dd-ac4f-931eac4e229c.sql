
-- Remove is_admin() from SELECT policies on data tables
-- so admins only see their own data in standard views

-- CLIENTS
DROP POLICY IF EXISTS "Users can view their own clients or admin can view all" ON public.clients;
CREATE POLICY "Users can view their own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

-- INGREDIENTS
DROP POLICY IF EXISTS "Users can view their own ingredients or admin can view all" ON public.ingredients;
CREATE POLICY "Users can view their own ingredients"
  ON public.ingredients FOR SELECT
  USING (auth.uid() = user_id);

-- ORDERS
DROP POLICY IF EXISTS "Users can view their own orders or admin can view all" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- RECIPES
DROP POLICY IF EXISTS "Users can view their own recipes or admin can view all" ON public.recipes;
CREATE POLICY "Users can view their own recipes"
  ON public.recipes FOR SELECT
  USING (auth.uid() = user_id);

-- RECIPE_ITEMS
DROP POLICY IF EXISTS "Users can view their recipe items or admin can view all" ON public.recipe_items;
CREATE POLICY "Users can view their own recipe items"
  ON public.recipe_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_items.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view their own transactions or admin can view all" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- PLATFORMS
DROP POLICY IF EXISTS "Users can view their own platforms or admin can view all" ON public.platforms;
CREATE POLICY "Users can view their own platforms"
  ON public.platforms FOR SELECT
  USING (auth.uid() = user_id);

-- SHOPPING_LIST_ITEMS
DROP POLICY IF EXISTS "Users can view their own shopping list or admin can view all" ON public.shopping_list_items;
CREATE POLICY "Users can view their own shopping list"
  ON public.shopping_list_items FOR SELECT
  USING (auth.uid() = user_id);

-- Also remove is_admin() from UPDATE/DELETE on data tables (admin shouldn't modify other users' data from app)
-- CLIENTS
DROP POLICY IF EXISTS "Users can update their own clients or admin can update all" ON public.clients;
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own clients or admin can delete all" ON public.clients;
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- INGREDIENTS
DROP POLICY IF EXISTS "Users can update their own ingredients or admin can update all" ON public.ingredients;
CREATE POLICY "Users can update their own ingredients" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own ingredients or admin can delete all" ON public.ingredients;
CREATE POLICY "Users can delete their own ingredients" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);

-- ORDERS
DROP POLICY IF EXISTS "Users can update their own orders or admin can update all" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own orders or admin can delete all" ON public.orders;
CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- RECIPES
DROP POLICY IF EXISTS "Users can update their own recipes or admin can update all" ON public.recipes;
CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own recipes or admin can delete all" ON public.recipes;
CREATE POLICY "Users can delete their own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- RECIPE_ITEMS
DROP POLICY IF EXISTS "Users can update their recipe items or admin can update all" ON public.recipe_items;
CREATE POLICY "Users can update their own recipe items" ON public.recipe_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_items.recipe_id AND recipes.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can delete their recipe items or admin can delete all" ON public.recipe_items;
CREATE POLICY "Users can delete their own recipe items" ON public.recipe_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_items.recipe_id AND recipes.user_id = auth.uid()));

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can update their own transactions or admin can update all" ON public.transactions;
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own transactions or admin can delete all" ON public.transactions;
CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- PLATFORMS
DROP POLICY IF EXISTS "Users can update their own platforms or admin can update all" ON public.platforms;
CREATE POLICY "Users can update their own platforms" ON public.platforms FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own platforms or admin can delete all" ON public.platforms;
CREATE POLICY "Users can delete their own platforms" ON public.platforms FOR DELETE USING (auth.uid() = user_id);

-- SHOPPING_LIST_ITEMS
DROP POLICY IF EXISTS "Users can update their own shopping list items or admin can upd" ON public.shopping_list_items;
CREATE POLICY "Users can update their own shopping list items" ON public.shopping_list_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own shopping list items or admin can del" ON public.shopping_list_items;
CREATE POLICY "Users can delete their own shopping list items" ON public.shopping_list_items FOR DELETE USING (auth.uid() = user_id);

-- Create a security definer function for admin stats
CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS TABLE (
  user_id uuid,
  recipes_count bigint,
  transactions_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    (SELECT count(*) FROM public.recipes r WHERE r.user_id = p.user_id) as recipes_count,
    (SELECT count(*) FROM public.transactions t WHERE t.user_id = p.user_id) as transactions_count
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
$$;

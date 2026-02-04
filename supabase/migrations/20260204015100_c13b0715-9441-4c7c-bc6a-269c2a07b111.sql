-- =============================================
-- BLOCK 2: ADMIN MODULE - Create user_roles table with app_role enum
-- =============================================

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Add is_active and allowed_modules to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN allowed_modules TEXT[] NOT NULL DEFAULT ARRAY['all']::TEXT[];

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_admin());

-- =============================================
-- Update RLS on ALL existing tables to allow admin access
-- =============================================

-- INGREDIENTS: Drop and recreate policies with admin access
DROP POLICY IF EXISTS "Users can view their own ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Users can insert their own ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Users can update their own ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Users can delete their own ingredients" ON public.ingredients;

CREATE POLICY "Users can view their own ingredients or admin can view all"
ON public.ingredients FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own ingredients"
ON public.ingredients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingredients or admin can update all"
ON public.ingredients FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own ingredients or admin can delete all"
ON public.ingredients FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- PLATFORMS: Drop and recreate policies with admin access
DROP POLICY IF EXISTS "Users can view their own platforms" ON public.platforms;
DROP POLICY IF EXISTS "Users can insert their own platforms" ON public.platforms;
DROP POLICY IF EXISTS "Users can update their own platforms" ON public.platforms;
DROP POLICY IF EXISTS "Users can delete their own platforms" ON public.platforms;

CREATE POLICY "Users can view their own platforms or admin can view all"
ON public.platforms FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own platforms"
ON public.platforms FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platforms or admin can update all"
ON public.platforms FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own platforms or admin can delete all"
ON public.platforms FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- PROFILES: Drop and recreate policies with admin access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admin can view all"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile or admin can update all"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

-- RECIPES: Drop and recreate policies with admin access
DROP POLICY IF EXISTS "Users can view their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.recipes;

CREATE POLICY "Users can view their own recipes or admin can view all"
ON public.recipes FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own recipes"
ON public.recipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes or admin can update all"
ON public.recipes FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own recipes or admin can delete all"
ON public.recipes FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- RECIPE_ITEMS: Drop and recreate policies with admin access
DROP POLICY IF EXISTS "Users can view their recipe items" ON public.recipe_items;
DROP POLICY IF EXISTS "Users can insert their recipe items" ON public.recipe_items;
DROP POLICY IF EXISTS "Users can update their recipe items" ON public.recipe_items;
DROP POLICY IF EXISTS "Users can delete their recipe items" ON public.recipe_items;

CREATE POLICY "Users can view their recipe items or admin can view all"
ON public.recipe_items FOR SELECT
USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_items.recipe_id AND recipes.user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users can insert their recipe items"
ON public.recipe_items FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_items.recipe_id AND recipes.user_id = auth.uid())
);

CREATE POLICY "Users can update their recipe items or admin can update all"
ON public.recipe_items FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_items.recipe_id AND recipes.user_id = auth.uid())
  OR public.is_admin()
);

CREATE POLICY "Users can delete their recipe items or admin can delete all"
ON public.recipe_items FOR DELETE
USING (
  EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_items.recipe_id AND recipes.user_id = auth.uid())
  OR public.is_admin()
);

-- TRANSACTIONS: Drop and recreate policies with admin access
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions or admin can view all"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions or admin can update all"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own transactions or admin can delete all"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- =============================================
-- BLOCK 3: CLIENTS TABLE (CRM)
-- =============================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients or admin can view all"
ON public.clients FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own clients"
ON public.clients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients or admin can update all"
ON public.clients FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own clients or admin can delete all"
ON public.clients FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add client_id to transactions (optional field)
ALTER TABLE public.transactions ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- =============================================
-- BLOCK 4: ORDERS TABLE (Encomendas)
-- =============================================

CREATE TYPE public.order_status AS ENUM ('pending', 'in_production', 'ready', 'delivered', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  delivery_date DATE NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders or admin can view all"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders or admin can update all"
ON public.orders FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own orders or admin can delete all"
ON public.orders FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BLOCK 5: SHOPPING LISTS TABLE
-- =============================================

CREATE TABLE public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE NOT NULL,
  quantity_needed NUMERIC NOT NULL DEFAULT 1,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping list or admin can view all"
ON public.shopping_list_items FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own shopping list items"
ON public.shopping_list_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items or admin can update all"
ON public.shopping_list_items FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own shopping list items or admin can delete all"
ON public.shopping_list_items FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- =============================================
-- BLOCK 6: FIXES & REFINEMENTS
-- =============================================

-- Add entry_type to transactions (Venda Direta vs Repasse)
CREATE TYPE public.entry_type AS ENUM ('direct_sale', 'transfer');
ALTER TABLE public.transactions ADD COLUMN entry_type entry_type DEFAULT 'direct_sale';

-- Add color to platforms table
ALTER TABLE public.platforms ADD COLUMN color TEXT DEFAULT '#ea90c9';
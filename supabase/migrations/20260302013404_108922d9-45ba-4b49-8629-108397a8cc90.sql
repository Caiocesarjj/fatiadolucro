
CREATE TABLE public.recipe_recipe_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  sub_recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recipe sub-items"
  ON public.recipe_recipe_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_recipe_items.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "Users can insert their recipe sub-items"
  ON public.recipe_recipe_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_recipe_items.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "Users can update their recipe sub-items"
  ON public.recipe_recipe_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_recipe_items.recipe_id AND recipes.user_id = auth.uid()));

CREATE POLICY "Users can delete their recipe sub-items"
  ON public.recipe_recipe_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM recipes WHERE recipes.id = recipe_recipe_items.recipe_id AND recipes.user_id = auth.uid()));

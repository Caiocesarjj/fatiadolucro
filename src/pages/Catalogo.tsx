 import { useState, useEffect } from "react";
 import { AppLayout } from "@/components/layout/AppLayout";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/hooks/useAuth";
 import { useToast } from "@/hooks/use-toast";
 import { ShoppingBag, FileText, Search, ImageIcon } from "lucide-react";
 import { motion } from "framer-motion";
 
 interface Recipe {
   id: string;
   name: string;
   target_sale_price: number | null;
   category: string | null;
   photo_url: string | null;
 }
 
 const Catalogo = () => {
   const { user } = useAuth();
   const { toast } = useToast();
   const [recipes, setRecipes] = useState<Recipe[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (user) {
       fetchRecipes();
     }
   }, [user]);
 
   const fetchRecipes = async () => {
     try {
       const { data, error } = await supabase
         .from("recipes")
         .select("id, name, target_sale_price, category, photo_url")
         .order("name");
 
       if (error) throw error;
       setRecipes(data || []);
     } catch (error: any) {
       toast({
         variant: "destructive",
         title: "Erro ao carregar receitas",
         description: error.message,
       });
     } finally {
       setLoading(false);
     }
   };
 
   const filteredRecipes = recipes.filter((recipe) =>
     recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (recipe.category && recipe.category.toLowerCase().includes(searchTerm.toLowerCase()))
   );
 
   const formatCurrency = (value: number | null) => {
     if (value === null) return "Preço não definido";
     return new Intl.NumberFormat("pt-BR", {
       style: "currency",
       currency: "BRL",
     }).format(value);
   };
 
   const generatePDF = () => {
     // Create a printable catalog
     const printWindow = window.open("", "_blank");
     if (!printWindow) {
       toast({
         variant: "destructive",
         title: "Erro",
         description: "Permita pop-ups para gerar o PDF",
       });
       return;
     }
 
     const catalogHTML = `
       <!DOCTYPE html>
       <html>
       <head>
          <title>Catálogo - Fatia do Lucro</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #10B981; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .item { border: 1px solid #eee; border-radius: 8px; padding: 15px; text-align: center; }
            .item img { width: 100%; height: 120px; object-fit: cover; border-radius: 4px; background: #f5f5f5; }
            .name { font-weight: bold; margin: 10px 0 5px; }
            .category { color: #888; font-size: 12px; }
            .price { color: #10B981; font-size: 18px; font-weight: bold; margin-top: 10px; }
           @media print { body { padding: 0; } }
         </style>
       </head>
       <body>
         <h1>Catálogo de Produtos</h1>
         <div class="grid">
           ${filteredRecipes.map(recipe => `
             <div class="item">
               <div style="height: 120px; background: #f5f5f5; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                 ${recipe.photo_url 
                   ? `<img src="${recipe.photo_url}" alt="${recipe.name}" />`
                   : '<span style="color: #ccc;">Sem foto</span>'
                 }
               </div>
               <div class="name">${recipe.name}</div>
               <div class="category">${recipe.category || "Sem categoria"}</div>
               <div class="price">${formatCurrency(recipe.target_sale_price)}</div>
             </div>
           `).join("")}
         </div>
         <script>window.print();</script>
       </body>
       </html>
     `;
 
     printWindow.document.write(catalogHTML);
     printWindow.document.close();
   };
 
   return (
     <AppLayout title="Catálogo / Vitrine">
       <div className="space-y-6">
         {/* Header Actions */}
         <div className="flex flex-col sm:flex-row gap-4 justify-between">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Buscar por nome ou categoria..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-10"
             />
           </div>
           <Button
             onClick={generatePDF}
             className="bg-primary hover:bg-primary-hover text-primary-foreground"
           >
             <FileText className="h-4 w-4 mr-2" />
             Gerar Catálogo PDF
           </Button>
         </div>
 
         {/* Products Grid */}
         {loading ? (
           <div className="text-center py-12 text-muted-foreground">
             Carregando...
           </div>
         ) : filteredRecipes.length === 0 ? (
           <Card>
             <CardContent className="py-12 text-center">
               <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
               <p className="text-muted-foreground">
                 {searchTerm 
                   ? "Nenhum produto encontrado com esse termo"
                   : "Nenhuma receita cadastrada. Crie receitas na Calculadora para exibi-las aqui."}
               </p>
             </CardContent>
           </Card>
         ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {filteredRecipes.map((recipe, index) => (
               <motion.div
                 key={recipe.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.05 }}
               >
                 <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                   <div className="aspect-square bg-muted flex items-center justify-center">
                     {recipe.photo_url ? (
                       <img
                         src={recipe.photo_url}
                         alt={recipe.name}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       <ImageIcon className="h-12 w-12 text-muted-foreground" />
                     )}
                   </div>
                   <CardContent className="p-4">
                     <h3 className="font-semibold truncate">{recipe.name}</h3>
                     {recipe.category && (
                       <p className="text-xs text-muted-foreground mt-1">
                         {recipe.category}
                       </p>
                     )}
                     <p className="text-lg font-bold text-primary mt-2">
                       {formatCurrency(recipe.target_sale_price)}
                     </p>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </div>
         )}
       </div>
     </AppLayout>
   );
 };
 
 export default Catalogo;
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Lock, Crown, MessageCircle } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 
 interface UpgradeModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   type?: "recipe_limit" | "module_locked";
   moduleName?: string;
 }
 
 export const UpgradeModal = ({ open, onOpenChange, type = "recipe_limit", moduleName }: UpgradeModalProps) => {
   const navigate = useNavigate();
 
   const handleUpgrade = () => {
     onOpenChange(false);
     navigate("/planos");
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader className="text-center">
           <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
             <Lock className="h-8 w-8 text-primary" />
           </div>
           <DialogTitle className="text-xl">
             {type === "recipe_limit"
               ? "Limite de Receitas Atingido!"
               : `Módulo "${moduleName}" Bloqueado`}
           </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {type === "recipe_limit"
                ? "Você atingiu o limite de receitas do plano Grátis. Faça o upgrade para o plano PRO e crie receitas ilimitadas!"
                : `Você atingiu o limite grátis de ${moduleName}. Seja PRO para lucrar sem limites!`}
            </DialogDescription>
         </DialogHeader>
         <div className="space-y-3 pt-4">
           <Button
             onClick={handleUpgrade}
             className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
           >
             <Crown className="h-4 w-4 mr-2" />
             Ver Planos e Fazer Upgrade
           </Button>
           <Button
             variant="outline"
             onClick={() => onOpenChange(false)}
             className="w-full"
           >
             Voltar
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };